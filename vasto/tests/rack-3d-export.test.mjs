import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CLIENT_VIEW_DIRECTION, frameDiagonalView } from '../lib/admin/rack-3d-export.mjs';

test('client perspective fits every corner, including long rows and tall loads', () => {
  for (const [width, height, depth] of [[1, 2, .4], [30, 2, 1.1], [3, 9, 1.1], [20, 6, 30]]) {
    const bounds = new THREE.Box3(new THREE.Vector3(-width / 2, 0, -depth / 2), new THREE.Vector3(width / 2, height, depth / 2));
    const camera = new THREE.PerspectiveCamera(32, 2, .01, 500);
    frameDiagonalView(camera, bounds, 2);
    const direction = camera.position.clone().sub(bounds.getCenter(new THREE.Vector3()));
    assert.ok(direction.x < 0 && direction.y > 0 && direction.z > 0);
    assert.ok(direction.normalize().dot(CLIENT_VIEW_DIRECTION) > .99999, 'uses the front three-quarter customer view');
    let visualExtent = 0;
    for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
      const point = new THREE.Vector3(x, y, z).project(camera);
      visualExtent = Math.max(visualExtent, Math.abs(point.x), Math.abs(point.y));
      assert.ok(Math.abs(point.x) < 1 && Math.abs(point.y) < 1 && Math.abs(point.z) < 1, `${width}m: corner is outside the image`);
    }
    assert.ok(visualExtent > .75 && visualExtent < .9, `${width}m: export is closely framed without cropping`);
  }
});
