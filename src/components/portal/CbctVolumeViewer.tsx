import { useEffect, useRef, useState } from "react";
import type * as Three from "three";
import { Box, Loader2, RotateCcw, Ruler, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { loadDicomVolume } from "./loadDicomVolume";

const CbctVolumeViewer = ({ urls }: { urls: string[] }) => {
  const host = useRef<HTMLDivElement>(null);
  const resetView = useRef<(() => void) | null>(null);
  const materialRef = useRef<Three.ShaderMaterial | null>(null);
  const controlsRef = useRef<{ enabled: boolean } | null>(null);
  const clearMeasurement = useRef<(() => void) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState("");
  const [measureMode, setMeasureMode] = useState(false);
  const [measurement, setMeasurement] = useState<number | null>(null);
  const [settings, setSettings] = useState(false);
  const [threshold, setThreshold] = useState(0.38);
  const [opacity, setOpacity] = useState(0.055);
  const [cutDepth, setCutDepth] = useState(0);

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.threshold.value = threshold;
      materialRef.current.uniforms.opacity.value = opacity;
      materialRef.current.uniforms.cutDepth.value = cutDepth;
    }
  }, [threshold, opacity, cutDepth]);

  useEffect(() => {
    if (controlsRef.current) controlsRef.current.enabled = !measureMode;
    if (!measureMode) clearMeasurement.current?.();
  }, [measureMode]);

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    setLoading(true);
    setError(null);
    setMeasurement(null);
    void (async () => {
      try {
        const [THREE, controlsModule, volume] = await Promise.all([
          import("three"),
          import("three/examples/jsm/controls/OrbitControls.js"),
          loadDicomVolume(urls),
        ]);
        if (disposed || !host.current) return;
        const container = host.current;
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        if (!renderer.capabilities.isWebGL2) {
          renderer.dispose();
          throw new Error("3D CBCT viewing requires WebGL 2 on this device");
        }
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(container.clientWidth, container.clientHeight, false);
        renderer.setClearColor(new THREE.Color(getComputedStyle(container).backgroundColor), 1);
        container.appendChild(renderer.domElement);
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(42, container.clientWidth / container.clientHeight, 0.01, 100);
        camera.position.set(1.8, 1.45, 1.8);
        const controls = new controlsModule.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.enabled = !measureMode;
        controlsRef.current = controls;

        const texture = new THREE.Data3DTexture(volume.data, ...volume.dimensions);
        texture.format = THREE.RedFormat;
        texture.type = THREE.UnsignedByteType;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.unpackAlignment = 1;
        texture.needsUpdate = true;
        const physical = new THREE.Vector3(
          volume.dimensions[0] * volume.spacing[0],
          volume.dimensions[1] * volume.spacing[1],
          volume.dimensions[2] * volume.spacing[2],
        );
        const size = physical.clone().divideScalar(Math.max(physical.x, physical.y, physical.z));
        const material = new THREE.ShaderMaterial({
          glslVersion: THREE.GLSL3,
          side: THREE.BackSide,
          transparent: true,
          depthWrite: false,
          uniforms: {
            map: { value: texture }, cameraPos: { value: new THREE.Vector3() },
            threshold: { value: threshold }, opacity: { value: opacity }, cutDepth: { value: cutDepth },
          },
          vertexShader: `out vec3 vPosition; void main(){ vPosition=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
          fragmentShader: `precision highp float; precision highp sampler3D;
            uniform sampler3D map; uniform vec3 cameraPos; uniform float threshold; uniform float opacity; uniform float cutDepth;
            in vec3 vPosition; out vec4 outColor;
            vec2 hitBox(vec3 origin, vec3 direction){ vec3 inv=1.0/direction; vec3 t0=(vec3(0.0)-origin)*inv; vec3 t1=(vec3(1.0)-origin)*inv; vec3 lo=min(t0,t1); vec3 hi=max(t0,t1); return vec2(max(max(lo.x,lo.y),lo.z),min(min(hi.x,hi.y),hi.z)); }
            void main(){ vec3 rayDir=normalize(vPosition-cameraPos); vec2 bounds=hitBox(cameraPos,rayDir); if(bounds.x>bounds.y) discard;
              float t=max(bounds.x,0.0); float stepSize=(bounds.y-t)/160.0; vec4 color=vec4(0.0);
              for(int i=0;i<160;i++){ vec3 p=cameraPos+(t+float(i)*stepSize)*rayDir;
                if(p.z<cutDepth) continue;
                float value=texture(map,p).r; float bone=smoothstep(threshold, min(threshold+0.28,1.0),value);
                float alpha=bone*opacity; vec3 shade=mix(vec3(.18,.32,.3),vec3(.96,.94,.82),bone);
                color.rgb+=(1.0-color.a)*shade*alpha; color.a+=(1.0-color.a)*alpha; if(color.a>.96) break;
              } if(color.a<.02) discard; outColor=color; }`,
        });
        materialRef.current = material;
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        geometry.translate(0.5, 0.5, 0.5);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.scale.copy(size);
        mesh.position.copy(size).multiplyScalar(-0.5);
        mesh.updateMatrixWorld();
        scene.add(mesh);

        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();
        let start: Three.Vector3 | null = null;
        let line: Three.Line | null = null;
        const hitAt = (event: PointerEvent) => {
          const rect = renderer.domElement.getBoundingClientRect();
          pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
          raycaster.setFromCamera(pointer, camera);
          return raycaster.intersectObject(mesh)[0]?.point.clone() ?? null;
        };
        const removeLine = () => {
          if (line) { scene.remove(line); line.geometry.dispose(); (line.material as Three.Material).dispose(); line = null; }
          start = null;
        };
        clearMeasurement.current = removeLine;
        const drawLine = (end: Three.Vector3) => {
          if (!start) return;
          if (line) { scene.remove(line); line.geometry.dispose(); (line.material as Three.Material).dispose(); }
          line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([start, end]), new THREE.LineBasicMaterial({ color: getComputedStyle(container).color, depthTest: false }));
          line.renderOrder = 1;
          scene.add(line);
        };
        const down = (event: PointerEvent) => {
          if (controls.enabled) return;
          removeLine();
          start = hitAt(event);
          if (start) { renderer.domElement.setPointerCapture(event.pointerId); setMeasurement(null); }
        };
        const move = (event: PointerEvent) => {
          if (!start || controls.enabled) return;
          const end = hitAt(event);
          if (end) drawLine(end);
        };
        const up = (event: PointerEvent) => {
          if (!start || controls.enabled) return;
          const end = hitAt(event);
          if (end) {
            drawLine(end);
            const localStart = mesh.worldToLocal(start.clone());
            const localEnd = mesh.worldToLocal(end.clone());
            const distance = localEnd.sub(localStart).multiply(physical).length();
            setMeasurement(Number(distance.toFixed(1)));
          }
          start = null;
        };
        renderer.domElement.addEventListener("pointerdown", down);
        renderer.domElement.addEventListener("pointermove", move);
        renderer.domElement.addEventListener("pointerup", up);
        resetView.current = () => { camera.position.set(1.8, 1.45, 1.8); controls.target.set(0, 0, 0); controls.update(); removeLine(); setMeasurement(null); };
        const resize = () => {
          if (!container.clientWidth || !container.clientHeight) return;
          camera.aspect = container.clientWidth / container.clientHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(container.clientWidth, container.clientHeight, false);
        };
        const observer = new ResizeObserver(resize);
        observer.observe(container);
        let animation = 0;
        const draw = () => {
          controls.update();
          material.uniforms.cameraPos.value.copy(mesh.worldToLocal(camera.position.clone()));
          renderer.render(scene, camera);
          animation = requestAnimationFrame(draw);
        };
        draw();
        setDimensions(`${volume.sourceDimensions.join(" × ")} voxels`);
        setLoading(false);
        cleanup = () => {
          cancelAnimationFrame(animation); observer.disconnect();
          renderer.domElement.removeEventListener("pointerdown", down);
          renderer.domElement.removeEventListener("pointermove", move);
          renderer.domElement.removeEventListener("pointerup", up);
          removeLine(); controls.dispose(); geometry.dispose(); material.dispose(); texture.dispose(); renderer.dispose(); renderer.domElement.remove();
          materialRef.current = null; controlsRef.current = null; resetView.current = null; clearMeasurement.current = null;
        };
        if (disposed) cleanup();
      } catch (caught) {
        if (!disposed) { setError(caught instanceof Error ? caught.message : "Unable to build the CBCT volume"); setLoading(false); }
      }
    })();
    return () => { disposed = true; cleanup(); };
  }, [urls]);

  const reset = () => { setThreshold(0.38); setOpacity(0.055); setCutDepth(0); resetView.current?.(); };
  return <div className="relative w-full bg-foreground text-background">
    <div className="relative h-[60vh] min-h-80 w-full overflow-hidden">
      <div ref={host} className="h-full w-full touch-none" aria-label="Interactive 3D CBCT volume" />
      {(loading || error) && <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm">{loading ? <Loader2 className="h-7 w-7 animate-spin" /> : error}</div>}
      {!loading && !error && <div className="absolute left-3 top-3 flex items-center gap-2 rounded-md bg-background/90 px-2 py-1 text-xs text-foreground"><Box className="h-3.5 w-3.5" />{dimensions}</div>}
      {!loading && !error && <Button size="icon" variant="secondary" className="absolute right-3 top-3" title="Reset 3D view" onClick={reset}><RotateCcw className="h-4 w-4" /></Button>}
    </div>
    {!loading && !error && <div className="space-y-3 border-t border-border bg-background p-3 text-foreground">
      <div className="flex items-center gap-2">
        <Button size="icon" variant={measureMode ? "default" : "outline"} title="Measure surface distance" aria-pressed={measureMode} onClick={() => setMeasureMode(v => !v)}><Ruler className="h-4 w-4" /></Button>
        <Button size="icon" variant={settings ? "default" : "outline"} title="Render settings" aria-expanded={settings} onClick={() => setSettings(v => !v)}><Settings2 className="h-4 w-4" /></Button>
        {measurement !== null && <span className="text-sm" role="status">Approx. surface distance: {measurement} mm</span>}
      </div>
      {settings && <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs">Threshold <Slider aria-label="Threshold" className="mt-2" min={0} max={0.85} step={0.01} value={[threshold]} onValueChange={v => setThreshold(v[0])} /></label>
        <label className="text-xs">Opacity <Slider aria-label="Opacity" className="mt-2" min={0.005} max={0.15} step={0.005} value={[opacity]} onValueChange={v => setOpacity(v[0])} /></label>
        <label className="text-xs">Cut depth <Slider aria-label="Cut depth" className="mt-2" min={0} max={0.95} step={0.01} value={[cutDepth]} onValueChange={v => setCutDepth(v[0])} /></label>
      </div>}
    </div>}
  </div>;
};

export default CbctVolumeViewer;
