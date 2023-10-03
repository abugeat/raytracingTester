// raytracingtester


import GUI from 'lil-gui'; 
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
const sphere = new THREE.SphereGeometry( 0.1, 20, 20 );

let workers = [];



const params = {
	textInfo: () => {
		const infoDiv = document.getElementById("textInfo");
		if (infoDiv.style.display === "none") {
			infoDiv.style.display = "block";
		} else {
			infoDiv.style.display = "none";
		}
	},
	importModel: () => {
		const input = document.getElementById("inputfile");
		input.click();
	},
	changeModelUp: () => changeModelUp(),
	invertModelUp: () => invertModelUp(),
	scaleModel10: () => scaleModel10(),
	scaleModel01: () => scaleModel01(),
	latitude: 45.95,
	raysnum: 100000,
	numOfWorkers: navigator.hardwareConcurrency/2,
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
	const materialpoi = new THREE.MeshBasicMaterial( { color: 0x1e850b} );
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
	const gui = new GUI();
	gui.title("raytracingtester");
	gui.add( params, 'textInfo').name( 'Info' );
	// lil-gui 3d Model
	const folderModel = gui.addFolder( '📥 3D Model' );
	folderModel.add( params, 'importModel' ).name( 'Import your model' );
	folderModel.add( params, 'changeModelUp' ).name( 'Change model up' );
	folderModel.add( params, 'invertModelUp' ).name( 'Invert model up' );
	folderModel.add( params, 'scaleModel10' ).name( 'Scale model x10' );	
	folderModel.add( params, 'scaleModel01' ).name( 'Scale model /10' );	
	// lil-gui Calculation
	const folderComputation = gui.addFolder( '🧮 Calculation' );
	folderComputation.add( params, 'raysnum', 1000, 1000000, 1000).name( 'Number of rays' ).onFinishChange( () => updateFromOptions() );
	folderComputation.add( params, 'numOfWorkers', 0, navigator.hardwareConcurrency, 1).name( 'Number of workers' ).onFinishChange( () => updateFromOptions() );
	// lil-gui Options
	const folderPoi = gui.addFolder( '🟢 Point Of Interset' );
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
	const folderOptions = gui.addFolder( '⚙️ Options' );
	folderOptions.add( params, 'impactvisible').name( 'Impact points').onChange( () => {
		if (params.impactvisible) {
			materialhit.visible = true;
			renderer.render( scene, camera );
		} else {
			materialhit.visible = false;
			renderer.render( scene, camera );
		}
	});
	// lil-gui Export
	// const folderExport = gui.addFolder( '📤 Export' );
	// folderExport.add( params, "saveIm").name( 'Save 3D view as .PNG' );
	// lil-gui About
	const folderAbout = gui.addFolder( '🔗 About' );
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

		// directions.push( [ Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5 ] );
		directions.push( getRandomDirection() );

	}

	// origin
	let poiorigin = poi.position;

	// ray tracing
	// Stop previous workers if they are running
	for (let i = 0; i < workers.length; i++) {
		workers[i].terminate();
	}
	switch (params.numOfWorkers) {
		case 0:
			doRaycasting(poiorigin, directions);
			break;
		default:
			doRaycastingWithWorkers(poiorigin, directions, params.numOfWorkers);
	}

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


function getRandomDirection() {
	// Generate random azimuth and altitude angles
	const azimuth = Math.random() * Math.PI * 2;
	const altitude = Math.random() * Math.PI;
  
	// Convert azimuth and altitude to spherical coordinates
	const x = Math.sin(altitude) * Math.cos(azimuth);
	const y = Math.cos(altitude); // y is up in three js
	const z = Math.sin(altitude) * Math.sin(azimuth);
  
	return [x, y, z];
}

function doRaycasting(origin, directions) {
	
	// RAY TRACING
	console.log("%c🚦 Start ray tracing without workers", "font-weight: bold");
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
	console.log("%c🏁 Time of ray tracing without workers: " + timeRayTracing, "font-weight: bold");


	showImpactPoints(impactPositions);

}


function doRaycastingWithWorkers(origin, directions, numOfWorkers) {

	
	// RAY TRACING
	console.log("%c🚦 Start ray tracing with " +numOfWorkers+ " workers", "font-weight: bold");
	const startTimeRayTracing = performance.now();
	
	
	// num of workers
	// console.log(navigator.hardwareConcurrency);
	let completedWorkers = 0;

	
	// Time to jsonify the scene
	const t0 = performance.now();
	// Convert the scene to JSON
	const sceneJson = JSON.stringify(scene.toJSON());
	const t1 = performance.now();
	console.log("Time to jsonify the scene: " + (t1 - t0) + " milliseconds.");
	


	
	// divide directions by numOfWorkers
	const directionsNumForOneWorker = Math.floor(directions.length / numOfWorkers);

	
	// Workers
	let allImpactPositions = [];
	let allSceneRebuildTimes = [];
	for (let i = 0; i < numOfWorkers; i++) {
		const directionsByWorker = directions.slice(i*directionsNumForOneWorker, (i+1)*directionsNumForOneWorker);
		
		// Create a worker 
		let worker = new Worker('raytracingWorkerBundle.js', { type: "module" });

		// Listen for messages from the worker
		worker.onmessage = function (e) {
			let impactPositions = e.data.impactPositions;
			let sceneRebuildTime = e.data.sceneRebuildTime;
				
			// Store results
			// allImpactPositions.push(...impactPositions);
			for (let i = 0; i < impactPositions.length; i++) {
				allImpactPositions.push(impactPositions[i]);
			}
			allSceneRebuildTimes.push(sceneRebuildTime);

			completedWorkers++;

			// SHOW
			if (completedWorkers === numOfWorkers) {
				// Time to rebuild the scene in workers
				const averageSceneRebuildTime = allSceneRebuildTimes.reduce((a, b) => a + b, 0) / allSceneRebuildTimes.length;
				console.log("Average time to rebuild the scene in workers: " + averageSceneRebuildTime + " milliseconds.");
				
				// Time
				let endTimeRayTracing = performance.now();
				let timeRayTracing = endTimeRayTracing - startTimeRayTracing;
				console.log("%c🏁 Time of ray tracing with " +numOfWorkers+ " workers: " + timeRayTracing+ " milliseconds. (Jsonification and scene rebuild in workers included)", "font-weight: bold");

				// All workers have finished, execute your function
				showImpactPoints(allImpactPositions);
			}

			worker.terminate();
		
		}

		// store worker in workers global array
		workers.push(worker);

		// Send the scene to the worker
		worker.postMessage({
			sceneJson: sceneJson,
			directions: directionsByWorker,
			origin: origin
		});
	}



}

function showImpactPoints(impactPositions) {
	


	// SHOW
	
	let startTimeShowRays = performance.now();
	

	// check impactPositions type
	if (!(impactPositions[0] instanceof THREE.Vector3)) {
		for (let i = 0; i < impactPositions.length; i++) {
			impactPositions[i] = new THREE.Vector3(impactPositions[i].x, impactPositions[i].y, impactPositions[i].z);
		}
	}

	// Create instance 
	const instanceGeometry = sphere.clone(); 
	const instances = impactPositions.length;

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

	render();

	let endTimeShowRays = performance.now();
	let timeShowRays = endTimeShowRays - startTimeShowRays;
	console.log("Time to show impact points: " + timeShowRays);

}