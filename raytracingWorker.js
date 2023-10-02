import * as THREE from 'three';
import {
	acceleratedRaycast, computeBoundsTree, disposeBoundsTree,
	SAH,
} from 'three-mesh-bvh';

THREE.Mesh.prototype.raycast = acceleratedRaycast;
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;


// Initialize Three.js in the worker


// Receive data from the main script
self.onmessage = function(event) {
    // console.log("event.data", event.data);

    let sceneJson = JSON.parse(event.data.sceneJson);
    let directions = event.data.directions;
    let origin = event.data.origin;

    const loader = new THREE.ObjectLoader();
    const scene = loader.parse(sceneJson); // new THREE.Scene();
    const raycaster = new THREE.Raycaster();
    raycaster.firstHitOnly = true;


    // bounds tree
    scene.children[2].children[0].geometry.computeBoundsTree( {
		// maxLeafTris: 5,
		strategy: parseFloat( SAH ),
	} );
	scene.children[2].children[0].geometry.boundsTree.splitStrategy = SAH;


    // find all the impact positions
    let impactPositions = [];
	for (let direction of directions) {

		const dirVec = new THREE.Vector3();
		dirVec.x = direction[0];
		dirVec.y = direction[1];
		dirVec.z = direction[2];
		dirVec.normalize();

		// perform raycasting from origin to direction
		raycaster.set( origin, dirVec );
		const res = raycaster.intersectObject( scene.children[2], true );
		if (res.length > 0) {
			impactPositions.push(res[0].point);
		}
	}

    // Send data back to the main script
    self.postMessage({ impactPositions: impactPositions});
};
