import { useEffect, useRef, useState, Suspense } from "react";
import { Box, Loader2, RotateCcw, Volume2, Maximize2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadDicomVolume } from "./loadDicomVolume";

type Props = {
  urls: string[];
  title?: string;
};

const CbctVolumeViewer = ({ urls, title = "CBCT volume" }: Props) => {
  const container = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);
  const volumeRef = useRef<any>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quality, setQuality] = useState<"low" | "medium" | "high">("medium");
  const [threshold, setThreshold] = useState(0.5);
  const [opacity, setOpacity] = useState(1);
  const [sliceZ, setSliceZ] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [info, setInfo] = useState("");

  useEffect(() => {
    let disposed = false;

    const init = async () => {
      try {
        if (!container.current) return;

        // Import Three.js dynamically
        const [THREE, controlsModule, volume] = await Promise.all([
          import("three"),
          import("three/examples/jsm/controls/OrbitControls.js"),
          loadDicomVolume(urls),
        ]);

        if (disposed || !container.current) return;

        setInfo(`Volume: ${volume.dimensions[0]}×${volume.dimensions[1]}×${volume.dimensions[2]} (downsampled)`);

        // Setup renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
        
        if (!renderer.capabilities.isWebGL2) {
          throw new Error("This device does not support WebGL 2, required for 3D volume rendering");
        }

        const width = container.current.clientWidth;
        const height = container.current.clientHeight;

        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(width, height, false);
        renderer.setClearColor(new THREE.Color(0x000000), 1);
        renderer.outputColorSpace = THREE.SRGBColorSpace;

        container.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Setup scene
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        // Setup camera
        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        camera.position.set(200, 150, 200);
        cameraRef.current = camera;

        // Setup controls
        const controls = new controlsModule.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.autoRotate = false;
        controls.enableZoom = true;
        controls.enablePan = true;
        controls.zoomSpeed = 2;
        controlsRef.current = controls;

        // Create 3D texture
        const texture = new THREE.Data3DTexture(volume.data, volume.dimensions[0], volume.dimensions[1], volume.dimensions[2]);
        texture.format = THREE.RedFormat;
        texture.type = THREE.UnsignedByteType;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.unpackAlignment = 1;
        texture.needsUpdate = true;

        // Normalize volume dimensions to unit cube
        const maxDim = Math.max(volume.dimensions[0], volume.dimensions[1], volume.dimensions[2]);
        const size = new THREE.Vector3(
          (volume.dimensions[0] / maxDim) * 100,
          (volume.dimensions[1] / maxDim) * 100,
          (volume.dimensions[2] / maxDim) * 100
        );

        // Volume rendering material with ray marching
        const material = new THREE.ShaderMaterial({
          side: THREE.BackSide,
          transparent: true,
          uniforms: {
            map: { value: texture },
            cameraPos: { value: new THREE.Vector3() },
            threshold: { value: threshold },
            opacity: { value: opacity },
            sliceZ: { value: sliceZ },
            volumeSize: { value: new THREE.Vector3(volume.dimensions[0], volume.dimensions[1], volume.dimensions[2]) },
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
            uniform float sliceZ;
            uniform vec3 volumeSize;
            varying vec3 vPosition;

            vec2 hitBox(vec3 origin, vec3 direction) {
              vec3 invDir = 1.0 / max(abs(direction), vec3(1e-9));
              vec3 t0 = (vec3(-0.5) - origin) * invDir;
              vec3 t1 = (vec3(0.5) - origin) * invDir;
              vec3 near = min(t0, t1);
              vec3 far = max(t0, t1);
              return vec2(max(near.x, max(near.y, near.z)), min(far.x, min(far.y, far.z)));
            }

            void main() {
              vec3 rayOrigin = vPosition;
              vec3 rayDir = normalize(rayOrigin - cameraPos);
              vec2 bounds = hitBox(rayOrigin, rayDir);

              if (bounds.x > bounds.y) discard;

              bounds.x = max(bounds.x, 0.0);
              float steps = 100.0;
              float stepSize = (bounds.y - bounds.x) / steps;
              
              vec4 accumColor = vec4(0.0);
              
              for (float i = 0.0; i < steps; i += 1.0) {
                float t = bounds.x + i * stepSize;
                vec3 samplePos = rayOrigin + t * rayDir + vec3(0.5);
                
                // Check slice cutting plane
                if (samplePos.z < sliceZ) continue;
                
                float value = texture(map, samplePos).r;
                
                if (value > threshold) {
                  vec4 sampleColor = vec4(value, value, value, 1.0);
                  sampleColor.a *= opacity / steps;
                  accumColor += sampleColor * (1.0 - accumColor.a);
                }
                
                if (accumColor.a >= 0.95) break;
              }
              
              gl_FragColor = accumColor;
            }
          `,
        });

        // Create box geometry for volume
        const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
        const volume3D = new THREE.Mesh(geometry, material);
        scene.add(volume3D);
        volumeRef.current = { mesh: volume3D, material };

        // Animation loop
        const animate = () => {
          requestAnimationFrame(animate);
          
          if (controlsRef.current) {
            controlsRef.current.update();
            material.uniforms.cameraPos.value.copy(camera.position);
          }
          
          renderer.render(scene, camera);
        };
        animate();

        // Handle window resize
        const handleResize = () => {
          if (!container.current) return;
          const w = container.current.clientWidth;
          const h = container.current.clientHeight;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h, false);
        };
        window.addEventListener("resize", handleResize);

        setLoading(false);

        return () => {
          window.removeEventListener("resize", handleResize);
          renderer.dispose();
          geometry.dispose();
          material.dispose();
          texture.dispose();
        };
      } catch (caught) {
        if (!disposed) {
          console.error(caught);
          setError(caught instanceof Error ? caught.message : "Failed to load 3D volume");
          setLoading(false);
        }
      }
    };

    void init();

    return () => {
      disposed = true;
    };
  }, [urls]);

  // Update shader uniforms when settings change
  useEffect(() => {
    if (volumeRef.current?.material) {
      volumeRef.current.material.uniforms.threshold.value = threshold;
      volumeRef.current.material.uniforms.opacity.value = opacity;
      volumeRef.current.material.uniforms.sliceZ.value = sliceZ;
    }
  }, [threshold, opacity, sliceZ]);

  const reset = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(200, 150, 200);
      controlsRef.current.reset();
    }
    setThreshold(0.5);
    setOpacity(1);
    setSliceZ(0);
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
        <div className="max-w-md rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-destructive">{error}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Try a different scan or contact support if the issue persists.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-black flex flex-col overflow-hidden">
      <div ref={container} className="flex-1 h-[420px] relative" />

      <div className="bg-background/95 backdrop-blur border-t border-border p-3 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="icon" variant="ghost" title="Reset view" onClick={reset}>
            <RotateCcw className="w-4 h-4" />
          </Button>

          <Button
            size="sm"
            variant={showSettings ? "default" : "outline"}
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="w-4 h-4 mr-1" /> Render Settings
          </Button>

          <span className="text-xs text-muted-foreground ml-auto">{info}</span>
        </div>

        {showSettings && (
          <div className="grid grid-cols-2 gap-3 p-2 bg-muted/20 rounded-md text-xs">
            <div>
              <label className="text-muted-foreground">Threshold</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <span className="text-[10px] text-muted-foreground">{(threshold * 100).toFixed(0)}%</span>
            </div>

            <div>
              <label className="text-muted-foreground">Opacity</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <span className="text-[10px] text-muted-foreground">{(opacity * 100).toFixed(0)}%</span>
            </div>

            <div className="col-span-2">
              <label className="text-muted-foreground">Slice Cutting Plane</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={sliceZ}
                onChange={(e) => setSliceZ(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <span className="text-[10px] text-muted-foreground">Cut depth: {(sliceZ * 100).toFixed(0)}%</span>
            </div>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground text-center">
          Drag to rotate • Scroll to zoom • Right-click to pan • R to reset
        </p>
      </div>
    </div>
  );
};

export default CbctVolumeViewer;
