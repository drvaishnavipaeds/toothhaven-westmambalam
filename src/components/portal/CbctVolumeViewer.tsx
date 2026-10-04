import { useEffect, useRef, useState } from "react";
import { Loader2, RotateCcw, Ruler, Settings, Move3D, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadDicomVolume } from "./loadDicomVolume";

type Props = {
  urls: string[];
  title?: string;
};

type MeasureState = {
  start: any | null;
  end: any | null;
};

const CbctVolumeViewer = ({ urls, title = "CBCT volume" }: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);
  const volumeRef = useRef<any>(null);
  const lineRef = useRef<any>(null);
  const raycasterRef = useRef<any>(null);
  const pointerRef = useRef<any>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [measureMode, setMeasureMode] = useState(false);
  const [measurement, setMeasurement] = useState<number | null>(null);
  const [measure, setMeasure] = useState<MeasureState>({ start: null, end: null });
  const [threshold, setThreshold] = useState(0.18);
  const [opacity, setOpacity] = useState(0.9);
  const [cutDepth, setCutDepth] = useState(0.25);
  const [showSettings, setShowSettings] = useState(false);
  const [info, setInfo] = useState("");

  useEffect(() => {
    let disposed = false;

    const init = async () => {
      try {
        if (!urls.length || !containerRef.current) {
          setLoading(false);
          return;
        }

        const [THREE, controlsModule, volume] = await Promise.all([
          import("three"),
          import("three/examples/jsm/controls/OrbitControls.js"),
          loadDicomVolume(urls),
        ]);

        if (disposed || !containerRef.current) return;

        const container = containerRef.current;

        const renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
        });

        if (!renderer.capabilities.isWebGL2) {
          throw new Error("This device does not support WebGL 2, which is required for 3D CBCT rendering.");
        }

        const width = container.clientWidth || 800;
        const height = container.clientHeight || 500;

        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(width, height, false);
        renderer.setClearColor(new THREE.Color(0x000000), 1);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        container.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 2000);
        camera.position.set(160, 120, 180);
        cameraRef.current = camera;

        const controls = new controlsModule.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.enablePan = true;
        controls.enableZoom = true;
        controls.target.set(0, 0, 0);
        controlsRef.current = controls;

        const raycaster = new THREE.Raycaster();
        raycasterRef.current = raycaster;
        pointerRef.current = new THREE.Vector2();

        const axisHelper = new THREE.AxesHelper(120);
        axisHelper.material.depthTest = false;
        axisHelper.renderOrder = 999;
        scene.add(axisHelper);

        const texture = new THREE.Data3DTexture(
          volume.data,
          volume.dimensions[0],
          volume.dimensions[1],
          volume.dimensions[2]
        );
        texture.format = THREE.RedFormat;
        texture.type = THREE.UnsignedByteType;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.needsUpdate = true;

        const maxDim = Math.max(volume.dimensions[0], volume.dimensions[1], volume.dimensions[2]);
        const size = new THREE.Vector3(
          (volume.dimensions[0] / maxDim) * 120,
          (volume.dimensions[1] / maxDim) * 120,
          (volume.dimensions[2] / maxDim) * 120
        );

        const material = new THREE.ShaderMaterial({
          side: THREE.BackSide,
          transparent: true,
          uniforms: {
            map: { value: texture },
            cameraPos: { value: new THREE.Vector3() },
            threshold: { value: threshold },
            opacity: { value: opacity },
            cutDepth: { value: cutDepth },
          },
          vertexShader: `
            varying vec3 vPosition;
            void main() {
              vPosition = position;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            precision highp float;
            precision highp sampler3D;

            uniform sampler3D map;
            uniform vec3 cameraPos;
            uniform float threshold;
            uniform float opacity;
            uniform float cutDepth;
            varying vec3 vPosition;

            void main() {
              vec3 rayOrigin = vPosition;
              vec3 rayDir = normalize(rayOrigin - cameraPos);

              vec4 accum = vec4(0.0);

              for (int i = 0; i < 180; i++) {
                float t = float(i) / 180.0;
                vec3 p = rayOrigin + rayDir * t;
                vec3 uv = p + vec3(0.5);

                if (uv.x < 0.0 || uv.y < 0.0 || uv.z < 0.0) continue;
                if (uv.x > 1.0 || uv.y > 1.0 || uv.z > 1.0) continue;

                if (uv.z < cutDepth) continue;

                float value = texture(map, uv).r;
                if (value > threshold) {
                  vec3 color = vec3(value, value, value);
                  vec4 sample = vec4(color, 1.0);
                  sample.a *= opacity;
                  accum += sample * (1.0 - accum.a);
                }

                if (accum.a > 0.96) break;
              }

              gl_FragColor = vec4(accum.rgb, accum.a);
            }
          `,
        });

        const box = new THREE.BoxGeometry(size.x, size.y, size.z);
        const mesh = new THREE.Mesh(box, material);
        scene.add(mesh);

        volumeRef.current = { mesh, material };

        const updateLine = () => {
          if (!measure.start || !measure.end) return;

          if (lineRef.current) {
            scene.remove(lineRef.current);
            lineRef.current.geometry.dispose();
            lineRef.current.material.dispose();
          }

          const geometry = new THREE.BufferGeometry().setFromPoints([measure.start, measure.end]);
          const material = new THREE.LineBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.9,
          });
          const line = new THREE.Line(geometry, material);
          line.renderOrder = 1000;
          scene.add(line);
          lineRef.current = line;
        };

        const handlePointerDown = (event: PointerEvent) => {
          if (!measureMode || !volumeRef.current) return;

          const rect = renderer.domElement.getBoundingClientRect();
          pointerRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          pointerRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

          raycasterRef.current.setFromCamera(pointerRef.current, camera);
          const hit = raycasterRef.current.intersectObject(volumeRef.current.mesh, false)[0];

          if (!hit) return;

          const point = hit.point.clone();
          setMeasure({ start: point, end: point });
          updateLine();
        };

        const handlePointerMove = (event: PointerEvent) => {
          if (!measureMode || !measure.start) return;

          const rect = renderer.domElement.getBoundingClientRect();
          pointerRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          pointerRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

          raycasterRef.current.setFromCamera(pointerRef.current, camera);
          const hit = raycasterRef.current.intersectObject(volumeRef.current.mesh, false)[0];

          if (!hit) return;

          const point = hit.point.clone();
          setMeasure((prev) => ({ ...prev, end: point }));
          updateLine();
        };

        const handlePointerUp = () => {
          if (!measure.start || !measure.end) return;

          const distance = measure.start.distanceTo(measure.end);
          const mm = distance * ((volume.spacing[0] + volume.spacing[1] + volume.spacing[2]) / 3);
          setMeasurement(Number(mm.toFixed(2)));
        };

        renderer.domElement.addEventListener("pointerdown", handlePointerDown);
        renderer.domElement.addEventListener("pointermove", handlePointerMove);
        renderer.domElement.addEventListener("pointerup", handlePointerUp);
        renderer.domElement.addEventListener("pointerleave", handlePointerUp);

        const animate = () => {
          if (disposed) return;

          requestAnimationFrame(animate);

          controls.update();
          material.uniforms.cameraPos.value.copy(camera.position);
          material.uniforms.threshold.value = threshold;
          material.uniforms.opacity.value = opacity;
          material.uniforms.cutDepth.value = cutDepth;

          renderer.render(scene, camera);
        };

        animate();

        const handleResize = () => {
          if (!containerRef.current) return;
          const w = containerRef.current.clientWidth;
          const h = containerRef.current.clientHeight;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h, false);
        };

        window.addEventListener("resize", handleResize);

        setLoading(false);
        setInfo(`Volume ${volume.dimensions[0]}×${volume.dimensions[1]}×${volume.dimensions[2]} • ${title}`);

        return () => {
          window.removeEventListener("resize", handleResize);
          renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
          renderer.domElement.removeEventListener("pointermove", handlePointerMove);
          renderer.domElement.removeEventListener("pointerup", handlePointerUp);
          renderer.domElement.removeEventListener("pointerleave", handlePointerUp);
          renderer.dispose();
          box.dispose();
          material.dispose();
          texture.dispose();
          scene.clear();
        };
      } catch (caught) {
        console.error(caught);
        setError(caught instanceof Error ? caught.message : "Failed to load CBCT volume");
        setLoading(false);
      }
    };

    void init();

    return () => {
      disposed = true;
    };
  }, [urls, title, threshold, opacity, cutDepth, measureMode]);

  const reset = () => {
    setThreshold(0.18);
    setOpacity(0.9);
    setCutDepth(0.25);
    setMeasureMode(false);
    setMeasurement(null);
    setMeasure({ start: null, end: null });

    if (controlsRef.current) {
      controlsRef.current.reset();
      controlsRef.current.target.set(0, 0, 0);
    }

    if (cameraRef.current) {
      cameraRef.current.position.set(160, 120, 180);
    }

    if (lineRef.current) {
      lineRef.current.geometry.dispose();
      lineRef.current.material.dispose();
      lineRef.current.parent?.remove(lineRef.current);
      lineRef.current = null;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center p-6 text-center">
        <div className="space-y-3">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading 3D CBCT volume…</p>
          <p className="text-xs text-muted-foreground">{info}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[420px] items-center justify-center p-6 text-center">
        <div className="max-w-md rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-destructive">{error}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Try a different series or use a standard uncompressed DICOM scan.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-black text-white">
      <div className="relative">
        <div ref={containerRef} className="h-[430px] w-full overflow-hidden bg-black" />

        <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-black/60 px-2 py-1 text-[10px] text-white">
          {title}
        </div>

        <div className="pointer-events-none absolute right-3 top-3 rounded-md bg-black/60 px-2 py-1 text-[10px] text-white">
          {measureMode ? "Measure mode" : "Rotate / Pan / Zoom"}
        </div>

        {measurement !== null && (
          <div className="pointer-events-none absolute right-3 top-12 rounded-md bg-black/70 px-2 py-1 text-[10px] text-white">
            Distance: {measurement} mm
          </div>
        )}

        {measure.start && measure.end && (
          <div className="pointer-events-none absolute left-3 bottom-3 rounded-md bg-black/70 px-2 py-1 text-[10px] text-white">
            {measure.start.distanceTo(measure.end).toFixed(2)} world units
          </div>
        )}
      </div>

      <div className="border-t border-border bg-background/95 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="icon" variant={measureMode ? "default" : "outline"} onClick={() => setMeasureMode((v) => !v)} title="Measurement">
            <Ruler className="w-4 h-4" />
          </Button>

          <Button size="icon" variant="outline" onClick={reset} title="Reset scene">
            <RotateCcw className="w-4 h-4" />
          </Button>

          <Button
            size="sm"
            variant={showSettings ? "default" : "outline"}
            onClick={() => setShowSettings((v) => !v)}
          >
            <Settings className="w-4 h-4 mr-1" />
            Render
          </Button>
        </div>

        {showSettings && (
          <div className="grid grid-cols-2 gap-3 p-2 text-xs">
            <div>
              <label className="text-muted-foreground">Threshold</label>
              <input
                type="range"
                min={0.01}
                max={0.5}
                step={0.01}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="text-[10px] text-muted-foreground">{threshold.toFixed(2)}</div>
            </div>

            <div>
              <label className="text-muted-foreground">Opacity</label>
              <input
                type="range"
                min={0.2}
                max={1}
                step={0.01}
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="text-[10px] text-muted-foreground">{opacity.toFixed(2)}</div>
            </div>

            <div className="col-span-2">
              <label className="text-muted-foreground">Cut plane</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={cutDepth}
                onChange={(e) => setCutDepth(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="text-[10px] text-muted-foreground">Depth {cutDepth.toFixed(2)}</div>
            </div>
          </div>
        )}

        <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Move3D className="h-3 w-3" />
            Drag to rotate • scroll to zoom
          </span>
          <span className="inline-flex items-center gap-1">
            <ScanLine className="h-3 w-3" />
            Axes visible
          </span>
        </div>
      </div>
    </div>
  );
};

export default CbctVolumeViewer;
