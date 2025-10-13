import { useEffect, useRef, useState } from 'react';
import type { Vector3 } from 'three';

interface EasterEggProps {
  isActive: boolean;
  onComplete: () => void;
}

export function EasterEgg({ isActive, onComplete }: EasterEggProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const sessionIdRef = useRef<string>(`punk-${Date.now()}`);

  useEffect(() => {
    if (!isActive) {
      // Clean up any remaining particle trails when becoming inactive
      const trails = document.querySelectorAll(`.${sessionIdRef.current}`);
      trails.forEach(trail => trail.remove());
      // Also clean up any generic punk-particle-trail elements as a fallback
      const allTrails = document.querySelectorAll('.punk-particle-trail');
      allTrails.forEach(trail => trail.remove());
      return;
    }

    // Auto-complete after 30 seconds
    const timer = setTimeout(() => {
      onComplete();
    }, 30000);

    // Track active state for cleanup
    let isComponentActive = true;

    // Load Three.js and dependencies
    const loadEasterEgg = async () => {
      // Dynamic imports for Three.js modules
      const [
        threeModule,
        { FontLoader },
        { TextGeometry },
        { MeshSurfaceSampler },
        { EffectComposer },
        { RenderPass },
        { UnrealBloomPass },
        { gsap }
      ] = await Promise.all([
        import('three'),
        import('three/examples/jsm/loaders/FontLoader.js'),
        import('three/examples/jsm/geometries/TextGeometry.js'),
        import('three/examples/jsm/math/MeshSurfaceSampler.js'),
        import('three/examples/jsm/postprocessing/EffectComposer.js'),
        import('three/examples/jsm/postprocessing/RenderPass.js'),
        import('three/examples/jsm/postprocessing/UnrealBloomPass.js'),
        import('gsap')
      ]);
      const THREE = threeModule as typeof import('three');

      if (!canvasRef.current) return;

      const canvas = canvasRef.current;
      
      // Core setup
      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.5;

      const scene = new THREE.Scene();
      scene.fog = new THREE.Fog(0x070f39, 100, 400);

      const camera = new THREE.PerspectiveCamera(
        50,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
      camera.position.set(0, 0, 150);

      // Epic lighting setup
      scene.add(new THREE.AmbientLight(0x528dfa, 0.3));
      
      const mainLight = new THREE.DirectionalLight(0xffffff, 1);
      mainLight.position.set(0, 50, 50);
      scene.add(mainLight);

      const redSpotlight = new THREE.SpotLight(0xc71929, 2, 200, Math.PI / 4, 0.5);
      redSpotlight.position.set(-50, 50, 100);
      scene.add(redSpotlight);

      const blueSpotlight = new THREE.SpotLight(0x528dfa, 2, 200, Math.PI / 4, 0.5);
      blueSpotlight.position.set(50, -50, 100);
      scene.add(blueSpotlight);

      // Post-processing bloom
      const composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.5,
        0.4,
        0.85
      );
      bloomPass.threshold = 0.2;
      bloomPass.strength = 2;
      bloomPass.radius = 0.8;
      composer.addPass(bloomPass);

      // Mouse tracking
      const mouse = new THREE.Vector2();
      const mouseWorldPos = new THREE.Vector3();
      
      const handleMouseMove = (e: MouseEvent) => {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        
        // Create particle trail only if component is still active
        if (Math.random() > 0.8 && isComponentActive) {
          const trail = document.createElement('div');
          trail.className = `punk-particle-trail ${sessionIdRef.current}`;
          trail.style.cssText = `
            position: fixed;
            left: ${e.clientX}px;
            top: ${e.clientY}px;
            width: 4px;
            height: 4px;
            background: #c71929;
            border-radius: 50%;
            pointer-events: none;
            box-shadow: 0 0 10px #c71929;
            z-index: 10001;
            animation: punkParticleFade 1s ease-out forwards;
          `;
          document.body.appendChild(trail);
          setTimeout(() => {
            if (trail && trail.parentNode) {
              trail.remove();
            }
          }, 1000);
        }
      };

      window.addEventListener('mousemove', handleMouseMove);

      // Particle system configuration
      const PARTICLE_COUNT = 15000;
      const COLORS = {
        red: new THREE.Color('#c71929'),
        blue: new THREE.Color('#528dfa'),
        white: new THREE.Color('#f9f9f9')
      };

      // Load font and create particles
      const loader = new FontLoader();
      loader.load('https://threejs.org/examples/fonts/helvetiker_bold.typeface.json', (font) => {
        
        // Sample points from text geometry
        const sampleTextPoints = (text: string, size: number, count: number) => {
          const geometry = new TextGeometry(text, {
            font,
            size,
            depth: 4,
            curveSegments: 12,
            bevelEnabled: true,
            bevelThickness: 0.5,
            bevelSize: 0.3,
            bevelSegments: 8
          });
          geometry.center();
          
          const mesh = new THREE.Mesh(geometry);
          const sampler = new MeshSurfaceSampler(mesh).build();
          
          const points: Vector3[] = [];
          const tempVector = new THREE.Vector3();
          
          for (let i = 0; i < count; i++) {
            sampler.sample(tempVector);
            points.push(tempVector.clone());
          }
          
          return points;
        };

        // Create point sets for particle formations
        // Instead of forming text, we'll create epic geometric patterns
        const createSpiralPoints = (count: number, radius: number) => {
          const points: Vector3[] = [];
          for (let i = 0; i < count; i++) {
            const t = i / count;
            const angle = t * Math.PI * 8; // 4 full spirals
            const r = radius * t;
            const height = (t - 0.5) * 100;
            points.push(new THREE.Vector3(
              Math.cos(angle) * r,
              height,
              Math.sin(angle) * r
            ));
          }
          return points;
        };
        
        const createRingPoints = (count: number, radius: number, yOffset: number = 0) => {
          const points: Vector3[] = [];
          for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            points.push(new THREE.Vector3(
              Math.cos(angle) * radius,
              yOffset,
              Math.sin(angle) * radius
            ));
          }
          return points;
        };
        
        const spiralPoints = createSpiralPoints(PARTICLE_COUNT, 150);
        const ringPoints: Vector3[] = [];
        // Create multiple expanding rings
        for (let ring = 0; ring < 5; ring++) {
          const ringRadius = 50 + ring * 30;
          const pointsPerRing = Math.floor(PARTICLE_COUNT / 5);
          const yOffset = (ring - 2) * 20;
          ringPoints.push(...createRingPoints(pointsPerRing, ringRadius, yOffset));
        }
        
        // Initialize particle buffers
        const positions = new Float32Array(PARTICLE_COUNT * 3);
        const colors = new Float32Array(PARTICLE_COUNT * 3);
        const sizes = new Float32Array(PARTICLE_COUNT);
        const velocities = new Float32Array(PARTICLE_COUNT * 3);
        
        // Random initial positions
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const i3 = i * 3;
          
          // Explosion start positions
          const radius = Math.random() * 200;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.random() * Math.PI;
          
          positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
          positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
          positions[i3 + 2] = radius * Math.cos(phi);
          
          // Initial velocities for explosion effect
          velocities[i3] = (Math.random() - 0.5) * 2;
          velocities[i3 + 1] = (Math.random() - 0.5) * 2;
          velocities[i3 + 2] = (Math.random() - 0.5) * 2;
          
          // Color distribution (40% red, 60% blue)
          const isRed = Math.random() < 0.4;
          const color = isRed ? COLORS.red : COLORS.blue;
          colors[i3] = color.r;
          colors[i3 + 1] = color.g;
          colors[i3 + 2] = color.b;
          
          sizes[i] = Math.random() * 3 + 1;
        }
        
        // Create particle geometry
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        
        // Custom shader material
        const material = new THREE.ShaderMaterial({
          uniforms: {
            time: { value: 0 },
            mousePos: { value: new THREE.Vector3() },
            sizeMultiplier: { value: 1.0 }
          },
          vertexShader: `
            attribute float size;
            attribute vec3 velocity;
            varying vec3 vColor;
            uniform float time;
            uniform vec3 mousePos;
            uniform float sizeMultiplier;
            
            void main() {
              vColor = color;
              vec3 pos = position;
              
              // Mouse influence with stronger effect
              float mouseDist = distance(pos, mousePos);
              if (mouseDist < 80.0) {
                vec3 push = normalize(pos - mousePos) * (80.0 - mouseDist) * 0.8;
                pos += push;
              }
              
              // Dynamic oscillation
              pos += velocity * sin(time * 3.0 + position.x * 0.01) * 0.8;
              
              vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
              gl_PointSize = size * sizeMultiplier * (300.0 / -mvPosition.z);
              gl_Position = projectionMatrix * mvPosition;
            }
          `,
          fragmentShader: `
            varying vec3 vColor;
            
            void main() {
              float r = distance(gl_PointCoord, vec2(0.5));
              if (r > 0.5) discard;
              
              float opacity = 1.0 - smoothstep(0.0, 0.5, r);
              gl_FragColor = vec4(vColor, opacity);
            }
          `,
          transparent: true,
          vertexColors: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        
        const particleSystem = new THREE.Points(geometry, material);
        scene.add(particleSystem);
        
        // Animation state
        const animState = {
          spiralProgress: 0,
          ringProgress: 0,
          explosionForce: 1,
          rotationSpeed: 1,
          colorShift: 0,
          particleSize: 1,
          glowIntensity: 1
        };
        
        // Epic animation timeline
        const tl = gsap.timeline({ delay: 5.5 }); // Delay for loading sequence
        
        // Initial implosion - particles rush to center
        tl.to(animState, {
          explosionForce: -2,
          duration: 1.5,
          ease: "power4.in",
          onUpdate: () => {
            const force = animState.explosionForce;
            for (let i = 0; i < PARTICLE_COUNT; i++) {
              const i3 = i * 3;
              positions[i3] *= 1 + force * 0.01;
              positions[i3 + 1] *= 1 + force * 0.01;
              positions[i3 + 2] *= 1 + force * 0.01;
            }
            geometry.attributes.position.needsUpdate = true;
          }
        })
        
        // Massive explosion outward
        .to(animState, {
          explosionForce: 3,
          particleSize: 2,
          duration: 0.5,
          ease: "expo.out",
          onUpdate: () => {
            const force = animState.explosionForce;
            for (let i = 0; i < PARTICLE_COUNT; i++) {
              const i3 = i * 3;
              const radius = 300;
              const theta = Math.random() * Math.PI * 2;
              const phi = Math.random() * Math.PI;
              
              positions[i3] = radius * Math.sin(phi) * Math.cos(theta) * force * 0.3;
              positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * force * 0.3;
              positions[i3 + 2] = radius * Math.cos(phi) * force * 0.3;
            }
            geometry.attributes.position.needsUpdate = true;
          }
        })
        
        // Form epic spiral
        .to(animState, {
          spiralProgress: 1,
          rotationSpeed: 2,
          duration: 3,
          ease: "power3.inOut",
          onUpdate: () => {
            const t = animState.spiralProgress;
            for (let i = 0; i < PARTICLE_COUNT; i++) {
              const i3 = i * 3;
              const target = spiralPoints[i];
              
              positions[i3] = THREE.MathUtils.lerp(positions[i3], target.x, t);
              positions[i3 + 1] = THREE.MathUtils.lerp(positions[i3 + 1], target.y, t);
              positions[i3 + 2] = THREE.MathUtils.lerp(positions[i3 + 2], target.z, t);
              
              // Shift colors through spectrum
              const hue = (i / PARTICLE_COUNT) * 360;
              const color = new THREE.Color(`hsl(${hue}, 100%, 50%)`);
              colors[i3] = THREE.MathUtils.lerp(colors[i3], color.r, t);
              colors[i3 + 1] = THREE.MathUtils.lerp(colors[i3 + 1], color.g, t);
              colors[i3 + 2] = THREE.MathUtils.lerp(colors[i3 + 2], color.b, t);
            }
            geometry.attributes.position.needsUpdate = true;
            geometry.attributes.color.needsUpdate = true;
          }
        })
        
        // Transform to expanding rings
        .to(animState, {
          ringProgress: 1,
          particleSize: 3,
          duration: 3,
          ease: "expo.inOut",
          onUpdate: () => {
            const t = animState.ringProgress;
            const s = animState.spiralProgress;
            
            for (let i = 0; i < PARTICLE_COUNT; i++) {
              const i3 = i * 3;
              const spiralPos = spiralPoints[i];
              const ringPos = ringPoints[i];
              
              positions[i3] = THREE.MathUtils.lerp(spiralPos.x, ringPos.x * 1.5, t);
              positions[i3 + 1] = THREE.MathUtils.lerp(spiralPos.y, ringPos.y, t);
              positions[i3 + 2] = THREE.MathUtils.lerp(spiralPos.z, ringPos.z * 1.5, t);
              
              // Pulse between red and blue
              const isRed = i % 2 === 0;
              const targetColor = isRed ? COLORS.red : COLORS.blue;
              colors[i3] = THREE.MathUtils.lerp(colors[i3], targetColor.r, t);
              colors[i3 + 1] = THREE.MathUtils.lerp(colors[i3 + 1], targetColor.g, t);
              colors[i3 + 2] = THREE.MathUtils.lerp(colors[i3 + 2], targetColor.b, t);
            }
            geometry.attributes.position.needsUpdate = true;
            geometry.attributes.color.needsUpdate = true;
          }
        })
        
        // Epic bloom pulse
        .to(bloomPass, {
          strength: 6,
          duration: 0.5,
          yoyo: true,
          repeat: 3,
          ease: "power2.inOut"
        })
        
        // Final particle dispersal
        .to(animState, {
          explosionForce: 10,
          particleSize: 0.1,
          duration: 2,
          ease: "power4.in",
          onUpdate: () => {
            const force = animState.explosionForce;
            for (let i = 0; i < PARTICLE_COUNT; i++) {
              const i3 = i * 3;
              positions[i3] *= 1 + force * 0.02;
              positions[i3 + 1] *= 1 + force * 0.02;
              positions[i3 + 2] *= 1 + force * 0.02;
              
              // Fade to white
              colors[i3] = THREE.MathUtils.lerp(colors[i3], COLORS.white.r, force / 10);
              colors[i3 + 1] = THREE.MathUtils.lerp(colors[i3 + 1], COLORS.white.g, force / 10);
              colors[i3 + 2] = THREE.MathUtils.lerp(colors[i3 + 2], COLORS.white.b, force / 10);
            }
            geometry.attributes.position.needsUpdate = true;
            geometry.attributes.color.needsUpdate = true;
          }
        });
        
        // Render loop
        const clock = new THREE.Clock();
        let animationId: number;
        
        function animate() {
          if (!isActive) return;
          
          animationId = requestAnimationFrame(animate);
          
          const time = clock.getElapsedTime();
          const delta = clock.getDelta();
          
          // Update uniforms
          material.uniforms.time.value = time;
          material.uniforms.sizeMultiplier.value = animState.particleSize;
          
          // Convert mouse to world position
          mouseWorldPos.set(mouse.x * 100, mouse.y * 100, 0);
          material.uniforms.mousePos.value = mouseWorldPos;
          
          // Rotate scene
          particleSystem.rotation.y += delta * animState.rotationSpeed * 0.1;
          particleSystem.rotation.x = Math.sin(time * 0.2) * 0.1;
          
          // Camera movement
          camera.position.x = Math.sin(time * 0.1) * 10;
          camera.position.y = Math.cos(time * 0.1) * 10;
          camera.lookAt(0, 0, 0);
          
          // Light animation
          redSpotlight.position.x = Math.sin(time) * 100;
          redSpotlight.position.z = Math.cos(time) * 100;
          blueSpotlight.position.x = Math.cos(time) * 100;
          blueSpotlight.position.z = Math.sin(time) * 100;
          
          composer.render();
        }
        
        animate();
        setIsLoaded(true);

        // Cleanup function
        return () => {
          if (animationId) {
            cancelAnimationFrame(animationId);
          }
          window.removeEventListener('mousemove', handleMouseMove);
          // Clean up any remaining particle trails
          const trails = document.querySelectorAll(`.${sessionIdRef.current}`);
          trails.forEach(trail => trail.remove());
          scene.clear();
          renderer.dispose();
          geometry.dispose();
          material.dispose();
        };
      });
    };

    loadEasterEgg();

    return () => {
      isComponentActive = false;
      clearTimeout(timer);
      // Clean up any remaining particle trails immediately
      const trails = document.querySelectorAll(`.${sessionIdRef.current}`);
      trails.forEach(trail => trail.remove());
    };
  }, [isActive, onComplete]);

  if (!isActive) return null;

  return (
    <div 
      className="fixed inset-0 z-[10000] overflow-hidden"
      onClick={onComplete}
    >
      {/* Add custom styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@900&display=swap');
        
        @keyframes punkParticleFade {
          to {
            transform: translateY(20px);
            opacity: 0;
          }
        }
        
        @keyframes punkGridScroll {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }
        
        @keyframes punkFadeInTitle {
          to { opacity: 1; }
        }
        
        @keyframes punkFadeOut {
          to { opacity: 0; }
        }
        
        @keyframes punkGlitchText {
          0%, 95% { 
            transform: translate(0);
            filter: hue-rotate(0deg);
          }
          95.5% { 
            transform: translate(2px, -2px);
            filter: hue-rotate(90deg);
          }
          96% { 
            transform: translate(-2px, 2px);
            filter: hue-rotate(-90deg);
          }
          96.5%, 100% { 
            transform: translate(0);
            filter: hue-rotate(0deg);
          }
        }
        
        @keyframes punkPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        
        @keyframes punkGlitchOverlay {
          0%, 90% { opacity: 0; }
          91% { opacity: 0.1; background: linear-gradient(transparent 50%, #c71929 50%); }
          92% { opacity: 0.05; background: linear-gradient(90deg, transparent 50%, #528dfa 50%); }
          93%, 100% { opacity: 0; }
        }
        
        @keyframes punkLoadingFade {
          0% { opacity: 0; }
          5% { opacity: 1; }
          85% { opacity: 1; }
          100% { opacity: 0; }
        }
        
        @keyframes punkTypeIn {
          to { opacity: 1; }
        }
        
        @keyframes punkEpicFlash {
          0% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 0.8; transform: scale(1.2); }
          100% { opacity: 0; transform: scale(1); }
        }
      `}</style>

      {/* Cyber grid background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-15"
        style={{
          backgroundImage: `
            linear-gradient(#528dfa 1px, transparent 1px),
            linear-gradient(90deg, #528dfa 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          animation: 'punkGridScroll 20s linear infinite'
        }}
      />

      {/* Epic entrance flash */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-0"
        style={{
          background: 'radial-gradient(circle, #528dfa 0%, transparent 70%)',
          animation: 'punkEpicFlash 2s ease-out 0.5s'
        }}
      />

      {/* Loading sequence */}
      <div 
        className="absolute top-[15%] left-1/2 transform -translate-x-1/2 text-lg font-mono opacity-0"
        style={{
          animation: 'punkLoadingFade 7s ease-out',
          textShadow: '0 0 20px currentColor, 0 0 40px currentColor',
          letterSpacing: '0.1em'
        }}
      >
        <div 
          className="my-2 opacity-0 text-cyan-400"
          style={{ animation: 'punkTypeIn 0.8s ease-out 0.2s forwards' }}
        >
          [INITIALIZING PUNK SYSTEM...]
        </div>
        <div 
          className="my-2 opacity-0 text-blue-400"
          style={{ animation: 'punkTypeIn 0.8s ease-out 1.2s forwards' }}
        >
          [LOADING NINJA PROTOCOLS...]
        </div>
        <div 
          className="my-2 opacity-0 text-indigo-400"
          style={{ animation: 'punkTypeIn 0.8s ease-out 2.2s forwards' }}
        >
          [ESTABLISHING PUBNUB CONNECTION...]
        </div>
        <div 
          className="my-2 opacity-0 text-purple-400"
          style={{ animation: 'punkTypeIn 0.8s ease-out 3.2s forwards' }}
        >
          [QUANTUM PARTICLES ALIGNED...]
        </div>
        <div 
          className="my-2 opacity-0 text-red-500 font-bold text-xl"
          style={{ animation: 'punkTypeIn 1s ease-out 4.2s forwards' }}
        >
          [SYSTEM READY]
        </div>
      </div>

      {/* Three.js Canvas */}
      <canvas 
        ref={canvasRef}
        className="w-full h-full block"
        style={{ cursor: 'crosshair' }}
      />

      {/* Glitch overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-0"
        style={{
          mixBlendMode: 'screen',
          animation: 'punkGlitchOverlay 10s infinite'
        }}
      />

      {/* Title overlay with glitch effect */}
      <div 
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 font-black text-center pointer-events-none opacity-0"
        style={{
          fontFamily: 'Orbitron, monospace',
          fontSize: 'clamp(2rem, 8vw, 5rem)',
          letterSpacing: '0.15em',
          mixBlendMode: 'screen',
          animation: 'punkFadeInTitle 2s ease-out 7s forwards'
        }}
      >
        <span 
          className="block relative text-blue-500"
          style={{
            textShadow: `
              0 0 10px currentColor,
              0 0 20px currentColor,
              0 0 40px currentColor,
              0 0 80px currentColor
            `,
            animation: 'punkGlitchText 8s infinite'
          }}
        >
          <span 
            className="text-red-600"
            style={{
              textShadow: `
                0 0 10px #c71929,
                0 0 20px #c71929,
                0 0 40px #c71929,
                0 0 80px #c71929
              `,
              animation: 'punkPulse 2s ease-in-out infinite'
            }}
          >
            P
          </span>
          UBNUB
        </span>
        <span 
          className="block relative text-blue-500"
          style={{
            textShadow: `
              0 0 10px currentColor,
              0 0 20px currentColor,
              0 0 40px currentColor,
              0 0 80px currentColor
            `,
            animation: 'punkGlitchText 8s infinite'
          }}
        >
          <span 
            className="text-red-600"
            style={{
              textShadow: `
                0 0 10px #c71929,
                0 0 20px #c71929,
                0 0 40px #c71929,
                0 0 80px #c71929
              `,
              animation: 'punkPulse 2s ease-in-out infinite'
            }}
          >
            U
          </span>
          LTIMATE
        </span>
        <span 
          className="block relative text-blue-500"
          style={{
            textShadow: `
              0 0 10px currentColor,
              0 0 20px currentColor,
              0 0 40px currentColor,
              0 0 80px currentColor
            `,
            animation: 'punkGlitchText 8s infinite'
          }}
        >
          <span 
            className="text-red-600"
            style={{
              textShadow: `
                0 0 10px #c71929,
                0 0 20px #c71929,
                0 0 40px #c71929,
                0 0 80px #c71929
              `,
              animation: 'punkPulse 2s ease-in-out infinite'
            }}
          >
            N
          </span>
          INJA
        </span>
        <span 
          className="block relative text-blue-500"
          style={{
            textShadow: `
              0 0 10px currentColor,
              0 0 20px currentColor,
              0 0 40px currentColor,
              0 0 80px currentColor
            `,
            animation: 'punkGlitchText 8s infinite'
          }}
        >
          <span 
            className="text-red-600"
            style={{
              textShadow: `
                0 0 10px #c71929,
                0 0 20px #c71929,
                0 0 40px #c71929,
                0 0 80px #c71929
              `,
              animation: 'punkPulse 2s ease-in-out infinite'
            }}
          >
            K
          </span>
          IT
        </span>
      </div>

      {/* Fade out overlay */}
      <div 
        className="absolute inset-0 bg-gray-900 pointer-events-none opacity-0"
        style={{
          animation: 'punkFadeInTitle 2s ease-out 28s forwards'
        }}
      />
    </div>
  );
}
