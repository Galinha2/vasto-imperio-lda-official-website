import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { rackModel } from './rack-3d-model.mjs';
import { createRackGeometry } from './rack-3d-geometry.mjs';

// Fit the complete configuration, including long rows, in a fixed diagonal view.
export function frameDiagonalView(camera, bounds, aspect) {
  const center = bounds.getCenter(new THREE.Vector3());
  const radius = Math.max(bounds.getSize(new THREE.Vector3()).length() / 2, .1);
  const direction = new THREE.Vector3(1, .25, 1.4).normalize();
  camera.position.copy(center).addScaledVector(direction, radius * 3);
  camera.lookAt(center);
  camera.updateMatrixWorld(true);
  const inverse = camera.matrixWorldInverse;
  let halfWidth = 0, halfHeight = 0;
  for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
    const corner = new THREE.Vector3(x, y, z).applyMatrix4(inverse);
    halfWidth = Math.max(halfWidth, Math.abs(corner.x));
    halfHeight = Math.max(halfHeight, Math.abs(corner.y));
  }
  const half = Math.max(halfHeight, halfWidth / aspect) * 1.12;
  camera.left = -half * aspect; camera.right = half * aspect;
  camera.top = half; camera.bottom = -half;
  camera.near = .01; camera.far = radius * 8 + 10;
  camera.updateProjectionMatrix();
}

export async function capture3dDrawing(entries, { english = false } = {}) {
  if (!entries?.length || entries.some(entry => !entry.preview3d?.length)) {
    throw new Error(english ? 'Edit and save older cart configurations to prepare their 3D drawings.' : 'Edite e guarde as configurações antigas do carrinho para preparar os desenhos 3D.');
  }
  await document.fonts?.ready;
  const width = 1400, panelHeight = 800;
  const sheet = document.createElement('canvas');
  sheet.width = width; sheet.height = panelHeight * entries.length;
  const context = sheet.getContext('2d');
  if (!context) throw new Error('Não foi possível preparar a imagem 3D.');
  context.fillStyle = '#ffffff'; context.fillRect(0, 0, sheet.width, sheet.height);
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(1); renderer.setSize(width, panelHeight - 100);
    renderer.setClearColor(0xf5f7fa, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environment = pmrem.fromScene(room, .04);
    room.dispose(); pmrem.dispose();
    try {
      for (const [index, entry] of entries.entries()) {
        const scene = new THREE.Scene();
        scene.environment = environment.texture; scene.environmentIntensity = .65;
        scene.add(new THREE.HemisphereLight(0xffffff, 0xb9c6d5, 1.2));
        const light = new THREE.DirectionalLight(0xfff6e9, 2);
        light.position.set(-3, 7, 5); scene.add(light);
        const fill = new THREE.DirectionalLight(0xddeeff, .7);
        fill.position.set(4, 3, -5); scene.add(fill);
        const configuration = new THREE.Group(); scene.add(configuration);
        const resources = [];
        try {
          for (const props of entry.preview3d) {
            const model = rackModel(props);
            if (!model) throw new Error('A configuração não permite gerar o desenho 3D.');
            const rack = createRackGeometry(model); resources.push(rack);
            // Geometry has its own centering offset; position a wrapper instead.
            const wrapper = new THREE.Group(); wrapper.add(rack.group);
            if (props.position) wrapper.position.fromArray(props.position);
            wrapper.rotation.y = props.rotation || 0;
            configuration.add(wrapper);
          }
          const camera = new THREE.OrthographicCamera();
          frameDiagonalView(camera, new THREE.Box3().setFromObject(configuration), width / (panelHeight - 100));
          renderer.render(scene, camera);
          context.drawImage(renderer.domElement, 0, index * panelHeight + 85);
          context.fillStyle = '#1d1d1f'; context.font = '600 26px Arial';
          context.fillText(`${index + 1}. ${entry.label || (english ? 'Configuration' : 'Configuração')} · 3D`, 40, index * panelHeight + 37, width - 80);
          context.fillStyle = '#6e6e73'; context.font = '18px Arial';
          const rows = entry.quantity || entry.rowCount;
          const quantity = rows ? (english ? `${rows} row(s) / unit(s) · ` : `${rows} fila(s) / unidade(s) · `) : '';
          context.fillText(english ? `Diagonal view · ${quantity}Illustrative drawing` : `Vista diagonal · ${quantity}Desenho ilustrativo`, 40, index * panelHeight + 67);
        } finally { resources.forEach(resource => resource.dispose()); }
      }
    } finally { environment.dispose(); }
    return sheet.toDataURL('image/jpeg', .86);
  } finally { renderer?.dispose(); renderer?.forceContextLoss(); }
}
