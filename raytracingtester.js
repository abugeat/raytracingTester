// raytracingtester


import * as dat from 'three/examples/jsm/libs/lil-gui.module.min.js';
import * as THREE from 'three';
import {
	acceleratedRaycast, computeBoundsTree, disposeBoundsTree,
	SAH,
} from 'three-mesh-bvh';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { IFCLoader } from "web-ifc-three/IFCLoader"; 
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';



THREE.Mesh.prototype.raycast = acceleratedRaycast;
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;

const bgColor = 0x000000;



// tree
let renderer, scene, camera, controls;
let mesh, geometry, material, containerObj;
let transcontrols;
let poi;
const knots = [];
const rayCasterObjects = [];
const materialhit = new THREE.MeshBasicMaterial( { color: 0x39FF14, transparent: true, opacity:0.5 } );
const materialrays = new THREE.MeshBasicMaterial( { color: 0x39FF14, transparent: true, opacity:0.5 } );


// Create ray casters in the scene
const raycaster = new THREE.Raycaster();
raycaster.firstHitOnly = true;
const sphere = new THREE.SphereGeometry( 0.25, 20, 20 );




const params = {
	importModel: () => document.getElementById("inputfile").click(),
	changeModelUp: () => changeModelUp(),
	invertModelUp: () => invertModelUp(),
	scaleModel10: () => scaleModel10(),
	scaleModel01: () => scaleModel01(),
	latitude: 45.95,
	raysnum: 2000,
	transcontrolsvisible: true,
	poisize: 5.0,
	impactvisible: true,
	saveSvg: () => saveSvg(),
	saveIm: () => saveIm(),
	// article: () => window.open('https://doi.org/10.1016/j.comgeo.2012.01.011', '_blank').focus(), 
    source: () => window.open('https://github.com/abugeat/raytracingtester/', '_blank').focus(),
    me: () => window.open('https://www.linkedin.com/in/antoine-bugeat-452167123/', '_blank').focus(),

};


init();
loadModel("cordoue.glb","glb");



function init() {

	// renderer setup
	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor( bgColor, 1 );
	document.body.appendChild( renderer.domElement );

	// scene setup
	scene = new THREE.Scene();

    // ambient light
	const light = new THREE.DirectionalLight( 0xffffff, 1.0 );
	light.position.set( 1, 2, 1 );
	scene.add( light );
	const light2 = new THREE.DirectionalLight( 0xffffff, 0.75 );
	light2.position.set( -1, 0.5, -1 );
	scene.add( light2 );
	// scene.add( new THREE.AmbientLight( 0xffffff, 0.5 ) );
	scene.background = new THREE.Color( 0xffffff );


	// geometry setup
	containerObj = new THREE.Object3D();
	material = new THREE.MeshPhongMaterial( { color: 0x999999 , side: THREE.DoubleSide} );
	scene.add( containerObj );


	// camera setup
	camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 50 );
	// camera.position.set(0, 10, 10) ;
	camera.far = 100000;
	camera.updateProjectionMatrix();

	
	// control setup
	controls = new OrbitControls( camera, renderer.domElement );
	// controls.target.set( 25, 0, -25 );
	controls.target.set(-25, -6, 0);
	controls.update();
	controls.addEventListener('change', function(){
		renderer.render( scene, camera );
	});


	//poi setup
	const materialpoi = new THREE.MeshBasicMaterial( { color: 0xb24531} );
	poi = new THREE.Mesh( sphere, materialpoi );
	poi.scale.multiplyScalar( 5.0 );
	poi.position.set(-25, -6, 0);
	scene.add(poi);
	//poi controler
	transcontrols = new TransformControls(camera, renderer.domElement);
	transcontrols.addEventListener( 'change', function ( event ) {
		renderer.render( scene, camera );
	} );
	transcontrols.addEventListener( 'dragging-changed', function ( event ) {
		controls.enabled = ! event.value;
	} );
	transcontrols.addEventListener( 'mouseDown', function ( event ) {
		rayCasterObjects.forEach( f => f.remove() );
		rayCasterObjects.splice(0, rayCasterObjects.length);
	} );
	transcontrols.addEventListener( 'mouseUp', function ( event ) {
		updateFromOptions();

		// rayCasterObjects.forEach( f => f.remove() );
		// renderer.render( scene, camera );
		// rayCasterObjects.splice(0, rayCasterObjects.length);
		// rayCasterObjects.forEach( f => f.update() );
	} );
	transcontrols.attach(poi);
	scene.add(transcontrols);
	
	
	// lil-gui
	const gui = new dat.GUI();
	gui.title("raytracingtester");
	// lil-gui 3d Model
	const folderModel = gui.addFolder( '📥 3D Model' );
	folderModel.add( params, 'importModel' ).name( 'Import your model' ).onChange( () => {
		
		const input = document.getElementById("inputfile");
		input.click();
	
	});
	folderModel.add( params, 'changeModelUp' ).name( 'Change model up' );
	folderModel.add( params, 'invertModelUp' ).name( 'Invert model up' );
	folderModel.add( params, 'scaleModel10' ).name( 'Scale model x10' );	
	folderModel.add( params, 'scaleModel01' ).name( 'Scale model /10' );	
	// lil-gui Calculation
	const folderComputation = gui.addFolder( '🧮 Calculation' );
	folderComputation.add( params, 'raysnum', 10, 1000000, 1).name( 'Number of rays' ).onChange( () => updateFromOptions() );
	// lil-gui Options
	const folderPoi = gui.addFolder( '🔴 Point Of Interset' );
	folderPoi.add( params, 'poisize', 0.1, 10, 0.01).name( 'POI size' ).onChange( () => {
		poi.scale.multiplyScalar( params.poisize/poi.scale.x );
		renderer.render( scene, camera );
	});
	folderPoi.add( poi.position, 'x').name( 'POI x' ).listen().onFinishChange( () => {
		updateFromOptions();
		renderer.render( scene, camera );
	});
	folderPoi.add( poi.position, 'y').name( 'POI y' ).listen().onFinishChange( () => {
		updateFromOptions();
		renderer.render( scene, camera );
	});
	folderPoi.add( poi.position, 'z').name( 'POI z' ).listen().onFinishChange( () => {
		updateFromOptions();
		renderer.render( scene, camera );
	});
	folderPoi.add( params, 'transcontrolsvisible').name( 'POI controler').onChange( () => {
		if (params.transcontrolsvisible) {
			transcontrols.attach(poi);
			renderer.render( scene, camera );
		} else {
			transcontrols.detach(poi);
			renderer.render( scene, camera );
		}
	});
	// lil-gui Options
	const folderOptions = gui.addFolder( '🎛 Options' );
	folderOptions.add( params, 'impactvisible').name( 'Impact points').onChange( () => {
		if (params.impactvisible) {
			materialhit.visible = true;
			renderer.render( scene, camera );
		} else {
			materialhit.visible = false;
			renderer.render( scene, camera );
		}
	});
	folderOptions.add( params, 'impactvisible').name( 'Rays').onChange( () => {
		if (params.impactvisible) {
			materialrays.visible = true;
			renderer.render( scene, camera );
		} else {
			materialrays.visible = false;
			renderer.render( scene, camera );
		}
	});
	// lil-gui Export
	// const folderExport = gui.addFolder( '📤 Export' );
	// folderExport.add( params, "saveIm").name( 'Save 3D view as .PNG' );
	// lil-gui About
	const folderAbout = gui.addFolder( '🔗 About' );
    // folderAbout.add( params, 'article').name( 'Beckers partition' );
    folderAbout.add( params, 'source').name( 'Source code' );
    folderAbout.add( params, 'me').name( 'Me' );

	// LOADER	
	const input = document.getElementById("inputfile");
	input.addEventListener("change", (event) => {
		
	  	const file = event.target.files[0];
	  	const url = URL.createObjectURL(file);
		const fileName = file.name;
		const fileExt = fileName.split('.').pop();

		// enable loading animation
		// document.getElementById("loading").style.display = "flex";
		
		loadModel(url, fileExt);

	});
	
	// resize eventlistener
	window.addEventListener( 'resize', function () {
		
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
	
		renderer.setSize( window.innerWidth, window.innerHeight );
	
		renderer.render( scene, camera );
	
	}, false );

}

function updateFromOptions() {


	rayCasterObjects.forEach( f => f.remove() );
	rayCasterObjects.splice(0, rayCasterObjects.length);

	// Update raycaster count
	while ( rayCasterObjects.length > params.raysnum ) {

		rayCasterObjects.pop().remove();

	}

	// while ( rayCasterObjects.length < params.raysnum ) {

	// 	addRaycaster();

	// }

	// generate a list of random directions for the rays
	const directions = [];
	for ( let i = 0; i < params.raysnum; i ++ ) {

		directions.push( [ Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5 ] );

	}

	// origin
	let poiorigin = poi.position;

	// ray tracing
	// doRaycasting(poiorigin, directions);

	doRaycastingWithWorkers(poiorigin, directions);

	// for (let r = 0; r<directions.length; r++) {
	// 	addRaycasterNew(poiorigin,directions[r],r);
	// }

	if ( ! geometry ) {
		return;
	}

	if ( ! geometry.boundsTree ) {

		console.time( 'computing bounds tree' );
		geometry.computeBoundsTree( {
			// maxLeafTris: 5,
			strategy: parseFloat( SAH ),
		} );
		geometry.boundsTree.splitStrategy = SAH;
		console.timeEnd( 'computing bounds tree' );

	}

    render();

}

function render() {


	// renderer.render( scene, camera );
	// rayCasterObjects.forEach( f => f.update() );
	renderer.render( scene, camera );


}

function loadModel(url, fileExt) {

	let loader;

	// enable loading animation
	document.getElementById("loading").style.display = "flex";

	// remove previous model
	containerObj.remove(containerObj.children[0]);

	switch (fileExt) {
		case "glb":
			loader = new GLTFLoader();
			loader.load(url, (gltf) => { //./cordoba.glb sacrecoeur.glb cordoue.glb torino.glb
				
				let subGeoList = [];
				gltf.scene.traverse( c => {
					if ( c.isMesh) { 
						subGeoList.push(c.geometry);
					}
				} );

				let meshgeometriesmerged = BufferGeometryUtils.mergeBufferGeometries(subGeoList, false);  
				
				// mesh = new THREE.Mesh( subMesh.geometry, new THREE.MeshBasicMaterial( { color: 0xff0000, wireframe: true }) );
				mesh = new THREE.Mesh( meshgeometriesmerged, material );

				// move mesh barycenter to global origin
				let center = getCenterPoint(mesh);
				mesh.geometry.translate(-center.x, -center.y, -center.z);


				// add new mesh
				geometry = mesh.geometry;
				containerObj.add( mesh );
	
				// set camera
				camera.position.set( -45, 20, 20);
				controls.target.set( -25, -6, 0);
				controls.update();

				letcomputeBoundsTree();

				updateFromOptions();

	
				// disable loading animation
				document.getElementById("loading").style.display = "none";
	
			});
			break;
		
		case "stl":
			loader = new STLLoader();
			loader.load(url, (geometry) => {				
			
				mesh = new THREE.Mesh(geometry, material);

				// move mesh barycenter to global origin
				let center = getCenterPoint(mesh);
				mesh.geometry.translate(-center.x, -center.y, -center.z);
											
				camera.position.set( 0, 40, -60 );
				controls.target.set( 0, 0, 0 );
				controls.update();
	
				// add new mesh
				geometry = mesh.geometry;
				containerObj.add( mesh );
	
				letcomputeBoundsTree();

				updateFromOptions();


				// disable loading animation
				document.getElementById("loading").style.display = "none";
			}
			// (xhr) => {
			// 	console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
			// },
			// (error) => {
			// 	console.log(error)
			// }
			);
			break;

		case "obj":
			loader = new OBJLoader();
			loader.load(url, (object) => {
				// console.log(object);
				let subGeoList = [];
				for (let i=0; i< object.children.length; i++) {
					let children = object.children[i];
					if (children.isMesh) {
						subGeoList.push(children.geometry);
					}
				}

				let meshgeometriesmerged = BufferGeometryUtils.mergeBufferGeometries(subGeoList, false);  
				
				// mesh = new THREE.Mesh( subMesh.geometry, new THREE.MeshBasicMaterial( { color: 0xff0000, wireframe: true }) );
				mesh = new THREE.Mesh( meshgeometriesmerged, material );

				// move mesh barycenter to global origin
				let center = getCenterPoint(mesh);
				mesh.geometry.translate(-center.x, -center.y, -center.z);
	
				camera.position.set( 0, 40, -60 );
				controls.target.set( 0, 0, 0 );
				controls.update();
	
				// add new mesh
				geometry = mesh.geometry;
				containerObj.add( mesh );

				letcomputeBoundsTree();

				updateFromOptions();

				// disable loading animation
				document.getElementById("loading").style.display = "none";

			}
			);
			break;

		case "ifc":
			loader = new IFCLoader();
			loader.ifcManager.setWasmPath("wasm/");
			loader.load(url, (ifcModel) => {
				
				// TO avoid Multi-root error when building bvh!
				ifcModel.geometry.clearGroups(); 

				mesh = new THREE.Mesh(ifcModel.geometry, material);

				// move mesh barycenter to global origin
				let center = getCenterPoint(mesh);
				mesh.geometry.translate(-center.x, -center.y, -center.z);
											
				camera.position.set( 0, 40, -60 );
				controls.target.set( 0, 0, 0 );
				controls.update();
				
				// add new mesh
				geometry = mesh.geometry;
				containerObj.add( mesh );
	
				letcomputeBoundsTree();

				updateFromOptions();


				// disable loading animation
				document.getElementById("loading").style.display = "none";
			}
			);
			break;

		default:
			console.log(`Sorry, file format not recognized.`);
	}

	
}

function getCenterPoint(mesh) {
	var geome = mesh.geometry;
	geome.computeBoundingBox();
	var center = new THREE.Vector3();
	geome.boundingBox.getCenter( center );
	mesh.localToWorld( center );
	return center;
}

function changeModelUp() {

	mesh.geometry.rotateX(Math.PI/2);
	mesh.geometry.rotateY(Math.PI/2);

	geometry = mesh.geometry;

	letcomputeBoundsTree();

	updateFromOptions();

}

function invertModelUp() {
	
	mesh.geometry.rotateX(Math.PI);
	
	geometry = mesh.geometry;

	letcomputeBoundsTree();

	updateFromOptions();

}

function scaleModel10() {
	
	mesh.scale.multiplyScalar( 10 );

	geometry = mesh.geometry;

	renderer.render(scene, camera); 

	letcomputeBoundsTree();

	updateFromOptions();


}

function scaleModel01() {

	mesh.scale.multiplyScalar( 0.1 );
	
	geometry = mesh.geometry;

	renderer.render(scene, camera); 

	letcomputeBoundsTree();

	updateFromOptions();

}

function letcomputeBoundsTree() {
	console.time( 'computing bounds tree' );
	geometry.computeBoundsTree( {
		// maxLeafTris: 5,
		strategy: parseFloat( SAH ),
	} );
	geometry.boundsTree.splitStrategy = SAH;
	console.timeEnd( 'computing bounds tree' );
}




function addRaycasterNew(origin,direction,id) {

	// reusable vectors
	const origVec = origin;

	const dirVec = new THREE.Vector3();
	dirVec.x = direction[0];
	dirVec.y = direction[1];
	dirVec.z = direction[2];
	dirVec.normalize();

	// Objects
	const objRay = new THREE.Object3D();
	// Hit ball
	const hitMesh = new THREE.Mesh( sphere, materialhit );
	hitMesh.scale.multiplyScalar( 0.75 );

	// fill rayCasterObjects list 
	rayCasterObjects.push( {
		update: () => {
			raycaster.set( origVec, dirVec );
			// raycaster.firstHitOnly = true;
			// console.log(containerObj);
			const res = raycaster.intersectObject( containerObj, true );
			// console.log(res);
			// console.log(dirVec);
			if (res.length > 0) {

				// hitPoint
				hitMesh.position.set(res[0].point.x, res[0].point.y, res[0].point.z);
				objRay.add( hitMesh );

				// rayline
				const geometryLine = new THREE.BufferGeometry().setFromPoints( [origVec, res[0].point] );
				const line = new THREE.Line( geometryLine, materialrays );
				objRay.add( line );

				// add to scene
				scene.add( objRay );
			}
		},

		remove: () => {

			scene.remove( objRay );

		}
	});

	rayCasterObjects[id].update();

}

function doRaycasting(origin, directions) {
	
	// RAY TRACING

	let startTimeRayTracing = performance.now();

	// for direction in directions
	let impactPositions = [];
	for (let direction of directions) {

		const dirVec = new THREE.Vector3();
		dirVec.x = direction[0];
		dirVec.y = direction[1];
		dirVec.z = direction[2];
		dirVec.normalize();

		// perform raycasting from origin to direction
		raycaster.set( origin, dirVec );
		const res = raycaster.intersectObject( containerObj, true );
		if (res.length > 0) {
			impactPositions.push(res[0].point);
		}
	}

	let endTimeRayTracing = performance.now();
	let timeRayTracing = endTimeRayTracing - startTimeRayTracing;
	console.log("timeRayTracing: " + timeRayTracing);


	showImpactPoints(impactPositions);

}

function doRaycastingWithWorkers(origin, directions) {

	let numOfWorkers = 4;

	// RAY TRACING
	
	let startTimeRayTracing = performance.now();

	// Convert the scene to JSON
	let sceneJson = JSON.stringify(scene.toJSON());

	// divide directions by numOfWorkers
	let directionsNumForOneWorker = Math.floor(directions.length / numOfWorkers);

	// console.log(navigator.hardwareConcurrency);
	
	// Workers
	// for (let i = 0; i < numOfWorkers; i++) {
	// 	let directionsByWorker = directions.slice(i*directionsNumForOneWorker, (i+1)*directionsNumForOneWorker);
	// 	// Create a worker
	// 	let worker = new Worker('raytracingWorker.js', { type: "module" });
	// 	// Send the scene to the worker
	// 	worker.postMessage({
	// 		sceneJson: sceneJson,
	// 		directions: directionsByWorker,
	// 		origin: origin
	// 	});
	// 	// console.log(sceneJson);
	// 	// Listen for messages from the worker
	// 	worker.onmessage = function (e) {
	// 		console.log(e.data);
	// 	}
	// 	console.log("worker created", worker);
	// }

	// Create a worker 
	var worker = new Worker('raytracingWorkerBundle.js', { type: "module" });

	let impactPositions;
	// Listen for messages from the worker
	worker.onmessage = function (e) {
		impactPositions = e.data.impactPositions;
		
		for (let i = 0; i < impactPositions.length; i++) {
			impactPositions[i] = new THREE.Vector3(impactPositions[i].x, impactPositions[i].y, impactPositions[i].z);
		}
		
		// SHOW
		showImpactPoints(impactPositions);

		//Time
		let endTimeRayTracing = performance.now();
		let timeRayTracing = endTimeRayTracing - startTimeRayTracing;
		console.log("timeRayTracing: " + timeRayTracing);
	
	}
	// Send the scene to the worker
	worker.postMessage({
		sceneJson: sceneJson,
		directions: directions,
		origin: origin
	});



	// let endTimeRayTracing = performance.now();
	// let timeRayTracing = endTimeRayTracing - startTimeRayTracing;
	// console.log("timeRayTracing: " + timeRayTracing);


	
}

function showImpactPoints(impactPositions) {
	
	// SHOW
	
	let startTimeShowRays = performance.now();
	
	// Create instance 
	const instanceGeometry = sphere.clone(); // Clone the original geometry
	const instances = impactPositions.length; // Number of instances

	// Create an InstancedMesh using the instanceGeometry and materialhit
	const hitInstancedMesh = new THREE.InstancedMesh(instanceGeometry, materialhit, instances);


	// for impact in impactPositions
	for (let i = 0; i < impactPositions.length-1; i++) {

		let impactPosition = impactPositions[i]
		// // Objects
		// const objRay = new THREE.Object3D();
		// // Hit ball
		// const hitMesh = new THREE.Mesh( sphere, materialhit );
		// hitMesh.scale.multiplyScalar( 0.75 );

		// fill rayCasterObjects list 
		rayCasterObjects.push( {
			update: () => {
				
				// // hitPoint
				// hitMesh.position.set(impactPosition.x, impactPosition.y, impactPosition.z);
				// objRay.add( hitMesh );

				// // add to scene
				// scene.add( objRay );
				

				// Set the position of the instance
				const matrix = new THREE.Matrix4();
				matrix.setPosition(impactPosition);
				hitInstancedMesh.setMatrixAt(i, matrix);

				// Add the instance to the scene
				scene.add(hitInstancedMesh);
			
			},

			remove: () => {

				scene.remove( hitInstancedMesh );

			}
		});

		rayCasterObjects[rayCasterObjects.length-1].update();
	
	}


	let endTimeShowRays = performance.now();
	let timeShowRays = endTimeShowRays - startTimeShowRays;
	console.log("timeShowRays: " + timeShowRays);

	console.log('scene', scene);
	render();
}