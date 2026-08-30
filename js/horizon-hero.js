/* horizon-hero.js — vanilla Three.js + GSAP port of horizon-hero-section.tsx */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

gsap.registerPlugin(ScrollTrigger);

(function () {
  'use strict';
  if (window.__hz) return;
  window.__hz = {};

  const S = window.__hz;
  S.scene = null; S.camera = null; S.renderer = null; S.composer = null;
  S.stars = []; S.nebula = null; S.mountains = []; S.animId = null;
  S.target = { x: 0, y: 30, z: 300 };
  S.smooth = { x: 0, y: 30, z: 300 };

  const canvas = document.querySelector('.hero-canvas');
  const titleRef = document.querySelector('.hero-title');
  const subtitleRef = document.querySelector('.hero-subtitle');
  const menuRef = document.querySelector('.side-menu');
  const progressRef = document.querySelector('.scroll-progress');
  const fillRef = document.querySelector('.progress-fill');
  const counterRef = document.querySelector('.section-counter');
  const totalSections = 2;

  let scrollProgress = 0;
  let currentSection = 0;

  function createStarField() {
    const starCount = 5000;
    for (let i = 0; i < 3; i++) {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(starCount * 3);
      const colors = new Float32Array(starCount * 3);
      const sizes = new Float32Array(starCount);

      for (let j = 0; j < starCount; j++) {
        const radius = 200 + Math.random() * 800;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        positions[j * 3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[j * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[j * 3 + 2] = radius * Math.cos(phi);

        const color = new THREE.Color();
        const choice = Math.random();
        if (choice < 0.7) color.setHSL(0, 0, 0.8 + Math.random() * 0.2);
        else if (choice < 0.9) color.setHSL(0.08, 0.5, 0.8);
        else color.setHSL(0.6, 0.5, 0.8);
        colors[j * 3] = color.r;
        colors[j * 3 + 1] = color.g;
        colors[j * 3 + 2] = color.b;
        sizes[j] = Math.random() * 2 + 0.5;
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

      const material = new THREE.ShaderMaterial({
        uniforms: { time: { value: 0 }, depth: { value: i } },
        vertexShader: `
          attribute float size;
          attribute vec3 color;
          varying vec3 vColor;
          uniform float time;
          uniform float depth;
          void main() {
            vColor = color;
            vec3 pos = position;
            float angle = time * 0.05 * (1.0 - depth * 0.3);
            vec2 rot = vec2(cos(angle), sin(angle));
            pos.xy = vec2(rot.x * pos.x - rot.y * pos.y, rot.y * pos.x + rot.x * pos.y);
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_PointSize = size * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          void main() {
            float dist = length(gl_PointCoord - vec2(0.5));
            if (dist > 0.5) discard;
            gl_FragColor = vec4(vColor, 1.0 - smoothstep(0.0, 0.5, dist));
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const stars = new THREE.Points(geometry, material);
      S.scene.add(stars);
      S.stars.push(stars);
    }
  }

  function createNebula() {
    const geometry = new THREE.PlaneGeometry(8000, 4000, 100, 100);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color1: { value: new THREE.Color(0x0033ff) },
        color2: { value: new THREE.Color(0xff0066) },
        opacity: { value: 0.3 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying float vElevation;
        uniform float time;
        void main() {
          vUv = uv;
          vec3 pos = position;
          float elevation = sin(pos.x * 0.01 + time) * cos(pos.y * 0.01 + time) * 20.0;
          pos.z += elevation;
          vElevation = elevation;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color1;
        uniform vec3 color2;
        uniform float opacity;
        uniform float time;
        varying vec2 vUv;
        varying float vElevation;
        void main() {
          float mixFactor = sin(vUv.x * 10.0 + time) * cos(vUv.y * 10.0 + time);
          vec3 color = mix(color1, color2, mixFactor * 0.5 + 0.5);
          float alpha = opacity * (1.0 - length(vUv - 0.5) * 2.0);
          alpha *= 1.0 + vElevation * 0.01;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const nebula = new THREE.Mesh(geometry, material);
    nebula.position.z = -1050;
    S.scene.add(nebula);
    S.nebula = nebula;
  }

  function createMountains() {
    const layers = [
      { distance: -50, height: 60, color: 0x1a1a2e, opacity: 1 },
      { distance: -100, height: 80, color: 0x16213e, opacity: 0.8 },
      { distance: -150, height: 100, color: 0x0f3460, opacity: 0.6 },
      { distance: -200, height: 120, color: 0x0a4668, opacity: 0.4 }
    ];
    layers.forEach((layer, index) => {
      const points = [];
      const segments = 50;
      for (let i = 0; i <= segments; i++) {
        const x = (i / segments - 0.5) * 1000;
        const y = Math.sin(i * 0.1) * layer.height +
          Math.sin(i * 0.05) * layer.height * 0.5 +
          Math.random() * layer.height * 0.2 - 100;
        points.push(new THREE.Vector2(x, y));
      }
      points.push(new THREE.Vector2(5000, -300));
      points.push(new THREE.Vector2(-5000, -300));

      const shape = new THREE.Shape(points);
      const geometry = new THREE.ShapeGeometry(shape);
      const material = new THREE.MeshBasicMaterial({
        color: layer.color,
        transparent: true,
        opacity: layer.opacity,
        side: THREE.DoubleSide
      });
      const mountain = new THREE.Mesh(geometry, material);
      mountain.position.z = layer.distance;
      mountain.position.y = -100;
      mountain.userData = { baseZ: layer.distance, index, parallax: 1 + index * 0.5 };
      S.scene.add(mountain);
      S.mountains.push(mountain);
    });
  }

  function createAtmosphere() {
    const geometry = new THREE.SphereGeometry(600, 32, 32);
    const material = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        uniform float time;
        void main() {
          float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          vec3 atmosphere = vec3(0.3, 0.6, 1.0) * intensity;
          atmosphere *= sin(time * 2.0) * 0.1 + 0.9;
          gl_FragColor = vec4(atmosphere, intensity * 0.25);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true
    });
    S.scene.add(new THREE.Mesh(geometry, material));
  }

  function animate() {
    S.animId = requestAnimationFrame(animate);
    const time = performance.now() * 0.001;

    S.stars.forEach(function (starField) {
      if (starField.material.uniforms) starField.material.uniforms.time.value = time;
    });
    if (S.nebula && S.nebula.material.uniforms) {
      S.nebula.material.uniforms.time.value = time * 0.5;
    }

    const ease = 0.05;
    S.smooth.x += (S.target.x - S.smooth.x) * ease;
    S.smooth.y += (S.target.y - S.smooth.y) * ease;
    S.smooth.z += (S.target.z - S.smooth.z) * ease;

    const floatX = Math.sin(time * 0.1) * 2;
    const floatY = Math.cos(time * 0.15) * 1;
    S.camera.position.x = S.smooth.x + floatX;
    S.camera.position.y = S.smooth.y + floatY;
    S.camera.position.z = S.smooth.z;
    S.camera.lookAt(0, 10, -600);

    S.mountains.forEach(function (mountain) {
      const p = mountain.userData.parallax;
      mountain.position.x = Math.sin(time * 0.1) * 2 * p;
      mountain.position.y = 50 + Math.cos(time * 0.15) * 1 * p;
    });

    if (S.composer) S.composer.render();
  }

  function handleResize() {
    if (!S.camera || !S.renderer || !S.composer) return;
    S.camera.aspect = window.innerWidth / window.innerHeight;
    S.camera.updateProjectionMatrix();
    S.renderer.setSize(window.innerWidth, window.innerHeight);
    S.composer.setSize(window.innerWidth, window.innerHeight);
  }

  function handleScroll() {
    const scrollY = window.scrollY;
    const windowHeight = window.innerHeight;
    const maxScroll = document.documentElement.scrollHeight - windowHeight;
    const progress = Math.min(scrollY / Math.max(maxScroll, 1), 1);
    scrollProgress = progress;
    currentSection = Math.min(Math.floor(progress * totalSections), totalSections - 1);

    const sectionProgress = ((progress * totalSections) % 1);
    const cameraPositions = [
      { x: 0, y: 30, z: 300 },
      { x: 0, y: 40, z: -50 },
      { x: 0, y: 50, z: -700 }
    ];
    const cur = cameraPositions[currentSection] || cameraPositions[0];
    const next = cameraPositions[currentSection + 1] || cur;
    S.target.x = cur.x + (next.x - cur.x) * sectionProgress;
    S.target.y = cur.y + (next.y - cur.y) * sectionProgress;
    S.target.z = cur.z + (next.z - cur.z) * sectionProgress;

    if (fillRef) fillRef.style.width = (progress * 100) + '%';
    if (counterRef) {
      counterRef.textContent = String(currentSection + 1).padStart(2, '0') + ' / ' + String(totalSections).padStart(2, '0');
    }
    const content = document.querySelector('.hero-content');
    if (content) content.classList.toggle('dimmed', scrollY > windowHeight * 0.5);
  }

  function splitTitle(el) {
    const targets = el.querySelectorAll('.title-line');
    const containers = targets.length ? Array.prototype.slice.call(targets) : [el];
    containers.forEach(function (container) {
      const text = container.textContent;
      container.textContent = '';
      for (let i = 0; i < text.length; i++) {
        const span = document.createElement('span');
        span.className = 'title-char';
        span.textContent = text[i] === ' ' ? '\u00A0' : text[i];
        container.appendChild(span);
      }
    });
  }

  function playIntro() {
    gsap.set([menuRef, titleRef, subtitleRef, progressRef], { visibility: 'visible' });
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      gsap.set([menuRef, titleRef, subtitleRef, progressRef], { opacity: 1 });
      return;
    }
    const tl = gsap.timeline();
    if (menuRef) tl.from(menuRef, { x: -100, opacity: 0, duration: 1, ease: 'power3.out' });
    if (titleRef) {
      tl.from(titleRef.querySelectorAll('.title-line'), {
        y: 80, opacity: 0, duration: 1.1, stagger: 0.12, ease: 'power3.out'
      }, '-=0.5');
    }
    if (subtitleRef) {
      tl.from(subtitleRef.querySelectorAll('.subtitle-line'), {
        y: 50, opacity: 0, duration: 1, stagger: 0.2, ease: 'power3.out'
      }, '-=0.8');
    }
    if (progressRef) {
      tl.from(progressRef, { opacity: 0, y: 50, duration: 1, ease: 'power2.out' }, '-=0.5');
      progressRef.style.visibility = 'visible';
    }
  }

  function init() {
    if (!canvas) return;

    S.scene = new THREE.Scene();
    S.scene.fog = new THREE.FogExp2(0x000000, 0.00025);

    S.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    S.camera.position.z = 100;
    S.camera.position.y = 20;

    try {
      S.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    } catch (e) {
      console.error('[horizon] WebGL unavailable', e);
      splitTitle(titleRef);
      playIntro();
      return;
    }
    S.renderer.setSize(window.innerWidth, window.innerHeight);
    S.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    S.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    S.renderer.toneMappingExposure = 0.5;

    S.composer = new EffectComposer(S.renderer);
    S.composer.addPass(new RenderPass(S.scene, S.camera));
    S.composer.addPass(new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight), 0.8, 0.4, 0.85
    ));

    createStarField();
    createNebula();
    createMountains();
    createAtmosphere();

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, { passive: true });

    animate();
    splitTitle(titleRef);
    handleScroll();
    playIntro();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* Nav dock (desktop pill rail + mobile FAB) is wired site-wide by js/social-dock.js */
})();