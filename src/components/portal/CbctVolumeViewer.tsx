import { useEffect, useRef, useState } from "react";
import { Box, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadDicomVolume } from "./loadDicomVolume";

const CbctVolumeViewer = ({ urls }: { urls: string[] }) => {
  const host = useRef<HTMLDivElement>(null);
  const resetView = useRef<(() => void) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState("");

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    void (async () => {
      try {
        setLoading(true);
        const [THREE, controlsModule, volume] = await Promise.all([
          import("three"),
          import("three/examples/jsm/controls/OrbitControls.js"),
          loadDicomVolume(urls),
        ]);
        if (disposed || !host.current) return;
        const container = host.current;
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        if (!renderer.capabilities.isWebGL2) throw new Error("3D CBCT viewing requires WebGL 2 on this device");
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(container.clientWidth, container.clientHeight, false);
        renderer.setClearColor(0x050807, 1);
        container.appendChild(renderer.domElement);
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(42, container.clientWidth / container.clientHeight, 0.01, 100);
        camera.position.set(1.8, 1.45, 1.8);
        const controls = new controlsModule.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        const texture = new THREE.Data3DTexture(volume.data, ...volume.dimensions);
        texture.format = THREE.RedFormat;
        texture.type = THREE.UnsignedByteType;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.unpackAlignment = 1;
        texture.needsUpdate = true;
        const size = new THREE.Vector3(
          volume.sourceDimensions[0] * volume.spacing[0],
          volume.sourceDimensions[1] * volume.spacing[1],
          volume.sourceDimensions[2] * volume.spacing[2],
        );
        size.divideScalar(Math.max(size.x, size.y, size.z));
        const material = new THREE.ShaderMaterial({
          side: THREE.BackSide,
          transparent: true,
          uniforms: { map: { value: texture }, cameraPos: { value: new THREE.Vector3() } },
          vertexShader: `varying vec3 vPosition; void main(){ vPosition=position+vec3(.5); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
          fragmentShader: `precision highp float; precision highp sampler3D; uniform sampler3D map; uniform vec3 cameraPos; varying vec3 vPosition;
            vec2 hitBox(vec3 origin, vec3 direction){ vec3 inv=1.0/direction; vec3 t0=(vec3(0.0)-origin)*inv; vec3 t1=(vec3(1.0)-origin)*inv; vec3 lo=min(t0,t1); vec3 hi=max(t0,t1); return vec2(max(max(lo.x,lo.y),lo.z),min(min(hi.x,hi.y),hi.z)); }
            void main(){ vec3 rayDir=normalize(vPosition-cameraPos); vec2 bounds=hitBox(cameraPos,rayDir); if(bounds.x>bounds.y) discard; float t=max(bounds.x,0.0); float stepSize=(bounds.y-t)/128.0; vec4 color=vec4(0.0); for(int i=0;i<128;i++){ vec3 p=cameraPos+(t+float(i)*stepSize)*rayDir; float value=texture(map,p).r; float bone=smoothstep(.38,.72,value); float alpha=bone*.055; vec3 shade=mix(vec3(.18,.32,.3),vec3(.96,.94,.82),bone); color.rgb+=(1.0-color.a)*shade*alpha; color.a+=(1.0-color.a)*alpha; if(color.a>.96) break; } if(color.a<.02) discard; gl_FragColor=color; }`,
        });
        const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
        geometry.translate(0.5 - size.x / 2, 0.5 - size.y / 2, 0.5 - size.z / 2);
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);
        const updateCamera = () => material.uniforms.cameraPos.value.copy(mesh.worldToLocal(camera.position.clone())).addScalar(0.5);
        resetView.current = () => { camera.position.set(1.8, 1.45, 1.8); controls.target.set(0, 0, 0); controls.update(); };
        const resize = () => { if (!container.clientWidth || !container.clientHeight) return; camera.aspect = container.clientWidth / container.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(container.clientWidth, container.clientHeight, false); };
        const observer = new ResizeObserver(resize);
        observer.observe(container);
        let animation = 0;
        const draw = () => { controls.update(); updateCamera(); renderer.render(scene, camera); animation = requestAnimationFrame(draw); };
        draw();
        setDimensions(`${volume.sourceDimensions.join(" × ")} voxels`);
        setLoading(false);
        cleanup = () => { cancelAnimationFrame(animation); observer.disconnect(); controls.dispose(); geometry.dispose(); material.dispose(); texture.dispose(); renderer.dispose(); renderer.domElement.remove(); };
      } catch (caught) {
        if (!disposed) { setError(caught instanceof Error ? caught.message : "Unable to build the CBCT volume"); setLoading(false); }
      }
    })();
    return () => { disposed = true; cleanup(); };
  }, [urls]);

  return <div className="relative h-[60vh] min-h-80 w-full overflow-hidden bg-foreground">
    <div ref={host} className="h-full w-full touch-none" aria-label="Interactive 3D CBCT volume" />
    {(loading || error) && <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-background">{loading ? <Loader2 className="h-7 w-7 animate-spin" /> : error}</div>}
    {!loading && !error && <div className="absolute left-3 top-3 flex items-center gap-2 rounded-md bg-background/90 px-2 py-1 text-xs text-foreground"><Box className="h-3.5 w-3.5" />{dimensions}</div>}
    {!loading && !error && <Button size="icon" variant="secondary" className="absolute right-3 top-3" title="Reset 3D view" onClick={() => resetView.current?.()}><RotateCcw className="h-4 w-4" /></Button>}
  </div>;
};

export default CbctVolumeViewer;