import * as THREE from 'three';
import WebGL from 'three/addons/capabilities/WebGL.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Stats from 'three/addons/libs/stats.module.js';
import {GUI} from "three/addons/libs/lil-gui.module.min";
// if ( WebGL.isWebGLAvailable() ) {
//
//     // Initiate function or other initializations here
//     animate();
//
// } else {
//     const warning = WebGL.getWebGLErrorMessage();
//     document.getElementById( 'container' ).appendChild( warning );
//
// }


function runThree() {
    const canvasEle = document.querySelector('canvas')
    if (canvasEle){
        canvasEle.parentNode.removeChild(canvasEle)
    }



    if(window.currentJs === 'box'){
        const renderer = new THREE.WebGLRenderer();
        renderer.setSize( window.innerWidth, window.innerHeight );
        document.body.appendChild( renderer.domElement );
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
        const geometry = new THREE.BoxGeometry( 1, 1, 1 );
        const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
        const cube = new THREE.Mesh( geometry, material );
        scene.add( cube );

        camera.position.z = 4;

        function animate() {
            requestAnimationFrame( animate );
            cube.rotation.x += 0.01;
            // cube.rotation.y += 0.01;
            renderer.render( scene, camera );
        }
        animate();
    }
    if (window.currentJs=== 'line'){
        const renderer = new THREE.WebGLRenderer();
        renderer.setSize( window.innerWidth, window.innerHeight );
        document.body.appendChild( renderer.domElement );
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 500 );
        camera.position.set( 0, 0, 100 );
        camera.lookAt( 0, 0, 0 );

        const material = new THREE.LineBasicMaterial( { color: 0x0000ff } );
        const points = [];
        points.push( new THREE.Vector3( - 10, 0, 0 ) );
        points.push( new THREE.Vector3( 0, 10, 0 ) );
        points.push( new THREE.Vector3( 10, 0, 0 ) );

        const geometry = new THREE.BufferGeometry().setFromPoints( points );
        const line = new THREE.Line( geometry, material );
        scene.add( line );
        renderer.render( scene, camera );
    }
    if (window.currentJs=== 'gltf'){
        let scene, renderer, camera, stats;
        let model, skeleton, mixer, clock;
        const crossFadeControls = [];

        let currentBaseAction = 'idle';
        const allActions = [];
        const baseActions = {
            idle: { weight: 1 },
            walk: { weight: 0 },
            run: { weight: 0 }
        };
        const additiveActions = {
            sneak_pose: { weight: 0 },
            sad_pose: { weight: 0 },
            agree: { weight: 0 },
            headShake: { weight: 0 }
        };
        let panelSettings, numAnimations;

        init();

        function init() {

            const container = document.body;
            clock = new THREE.Clock();

            scene = new THREE.Scene();
            scene.background = new THREE.Color( 0xa0a0a0 );
            scene.fog = new THREE.Fog( 0xa0a0a0, 10, 50 );

            const hemiLight = new THREE.HemisphereLight( 0xffffff, 0x8d8d8d, 3 );
            hemiLight.position.set( 0, 20, 0 );
            scene.add( hemiLight );

            const dirLight = new THREE.DirectionalLight( 0xffffff, 3 );
            dirLight.position.set( 3, 10, 10 );
            dirLight.castShadow = true;
            dirLight.shadow.camera.top = 2;
            dirLight.shadow.camera.bottom = - 2;
            dirLight.shadow.camera.left = - 2;
            dirLight.shadow.camera.right = 2;
            dirLight.shadow.camera.near = 0.1;
            dirLight.shadow.camera.far = 40;
            scene.add( dirLight );

            // ground

            const mesh = new THREE.Mesh( new THREE.PlaneGeometry( 100, 100 ), new THREE.MeshPhongMaterial( { color: 0xcbcbcb, depthWrite: false } ) );
            mesh.rotation.x = - Math.PI / 2;
            mesh.receiveShadow = true;
            scene.add( mesh );

            const loader = new GLTFLoader();
            loader.load( 'https://threejs.org/examples/models/gltf/Xbot.glb', function ( gltf ) {

                model = gltf.scene;
                scene.add( model );

                model.traverse( function ( object ) {

                    if ( object.isMesh ) object.castShadow = true;

                } );

                skeleton = new THREE.SkeletonHelper( model );
                skeleton.visible = false;
                scene.add( skeleton );

                const animations = gltf.animations;
                mixer = new THREE.AnimationMixer( model );

                numAnimations = animations.length;

                for ( let i = 0; i !== numAnimations; ++ i ) {

                    let clip = animations[ i ];
                    const name = clip.name;

                    if ( baseActions[ name ] ) {

                        const action = mixer.clipAction( clip );
                        activateAction( action );
                        baseActions[ name ].action = action;
                        allActions.push( action );

                    } else if ( additiveActions[ name ] ) {

                        // Make the clip additive and remove the reference frame

                        THREE.AnimationUtils.makeClipAdditive( clip );

                        if ( clip.name.endsWith( '_pose' ) ) {

                            clip = THREE.AnimationUtils.subclip( clip, clip.name, 2, 3, 30 );

                        }

                        const action = mixer.clipAction( clip );
                        activateAction( action );
                        additiveActions[ name ].action = action;
                        allActions.push( action );

                    }

                }

                createPanel();

                animate();

            } );

            renderer = new THREE.WebGLRenderer( { antialias: true } );
            renderer.setPixelRatio( window.devicePixelRatio );
            renderer.setSize( window.innerWidth, window.innerHeight );
            renderer.shadowMap.enabled = true;
            container.appendChild( renderer.domElement );

            // camera
            camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 100 );
            camera.position.set( - 1, 2, 3 );

            const controls = new OrbitControls( camera, renderer.domElement );
            controls.enablePan = false;
            controls.enableZoom = false;
            controls.target.set( 0, 1, 0 );
            controls.update();

            stats = new Stats();
            container.appendChild( stats.dom );

            window.addEventListener( 'resize', onWindowResize );

        }

        function createPanel() {

            const panel = new GUI( { width: 310 } );

            const folder1 = panel.addFolder( 'Base Actions' );
            const folder2 = panel.addFolder( 'Additive Action Weights' );
            const folder3 = panel.addFolder( 'General Speed' );

            panelSettings = {
                'modify time scale': 1.0
            };

            const baseNames = [ 'None', ...Object.keys( baseActions ) ];

            for ( let i = 0, l = baseNames.length; i !== l; ++ i ) {

                const name = baseNames[ i ];
                const settings = baseActions[ name ];
                panelSettings[ name ] = function () {

                    const currentSettings = baseActions[ currentBaseAction ];
                    const currentAction = currentSettings ? currentSettings.action : null;
                    const action = settings ? settings.action : null;

                    if ( currentAction !== action ) {

                        prepareCrossFade( currentAction, action, 0.35 );

                    }

                };

                crossFadeControls.push( folder1.add( panelSettings, name ) );

            }

            for ( const name of Object.keys( additiveActions ) ) {

                const settings = additiveActions[ name ];

                panelSettings[ name ] = settings.weight;
                folder2.add( panelSettings, name, 0.0, 1.0, 0.01 ).listen().onChange( function ( weight ) {

                    setWeight( settings.action, weight );
                    settings.weight = weight;

                } );

            }

            folder3.add( panelSettings, 'modify time scale', 0.0, 1.5, 0.01 ).onChange( modifyTimeScale );

            folder1.open();
            folder2.open();
            folder3.open();

            crossFadeControls.forEach( function ( control ) {

                control.setInactive = function () {

                    control.domElement.classList.add( 'control-inactive' );

                };

                control.setActive = function () {

                    control.domElement.classList.remove( 'control-inactive' );

                };

                const settings = baseActions[ control.property ];

                if ( ! settings || ! settings.weight ) {

                    control.setInactive();

                }

            } );

        }

        function activateAction( action ) {

            const clip = action.getClip();
            const settings = baseActions[ clip.name ] || additiveActions[ clip.name ];
            setWeight( action, settings.weight );
            action.play();

        }

        function modifyTimeScale( speed ) {

            mixer.timeScale = speed;

        }

        function prepareCrossFade( startAction, endAction, duration ) {

            // If the current action is 'idle', execute the crossfade immediately;
            // else wait until the current action has finished its current loop

            if ( currentBaseAction === 'idle' || ! startAction || ! endAction ) {

                executeCrossFade( startAction, endAction, duration );

            } else {

                synchronizeCrossFade( startAction, endAction, duration );

            }

            // Update control colors

            if ( endAction ) {

                const clip = endAction.getClip();
                currentBaseAction = clip.name;

            } else {

                currentBaseAction = 'None';

            }

            crossFadeControls.forEach( function ( control ) {

                const name = control.property;

                if ( name === currentBaseAction ) {

                    control.setActive();

                } else {

                    control.setInactive();

                }

            } );

        }

        function synchronizeCrossFade( startAction, endAction, duration ) {

            mixer.addEventListener( 'loop', onLoopFinished );

            function onLoopFinished( event ) {

                if ( event.action === startAction ) {

                    mixer.removeEventListener( 'loop', onLoopFinished );

                    executeCrossFade( startAction, endAction, duration );

                }

            }

        }

        function executeCrossFade( startAction, endAction, duration ) {

            // Not only the start action, but also the end action must get a weight of 1 before fading
            // (concerning the start action this is already guaranteed in this place)

            if ( endAction ) {

                setWeight( endAction, 1 );
                endAction.time = 0;

                if ( startAction ) {

                    // Crossfade with warping

                    startAction.crossFadeTo( endAction, duration, true );

                } else {

                    // Fade in

                    endAction.fadeIn( duration );

                }

            } else {

                // Fade out

                startAction.fadeOut( duration );

            }

        }

        // This function is needed, since animationAction.crossFadeTo() disables its start action and sets
        // the start action's timeScale to ((start animation's duration) / (end animation's duration))

        function setWeight( action, weight ) {

            action.enabled = true;
            action.setEffectiveTimeScale( 1 );
            action.setEffectiveWeight( weight );

        }

        function onWindowResize() {

            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();

            renderer.setSize( window.innerWidth, window.innerHeight );

        }

        function animate() {

            // Render loop

            requestAnimationFrame( animate );

            for ( let i = 0; i !== numAnimations; ++ i ) {

                const action = allActions[ i ];
                const clip = action.getClip();
                const settings = baseActions[ clip.name ] || additiveActions[ clip.name ];
                settings.weight = action.getEffectiveWeight();

            }

            // Get the time elapsed since the last frame, used for mixer update

            const mixerUpdateDelta = clock.getDelta();

            // Update the animation mixer, the stats panel, and render this frame

            mixer.update( mixerUpdateDelta );

            stats.update();

            renderer.render( scene, camera );

        }
    }
    if (window.currentJs === 'text'){
        let container;

        let camera, cameraTarget, scene, renderer;

        let group, textMesh1, textMesh2, textGeo, materials;

        let firstLetter = true;

        let text = 'three.js',

            bevelEnabled = true,

            font = undefined,

            fontName = 'optimer', // helvetiker, optimer, gentilis, droid sans, droid serif
            fontWeight = 'bold'; // normal bold

        const depth = 20,
            size = 70,
            hover = 30,

            curveSegments = 4,

            bevelThickness = 2,
            bevelSize = 1.5;

        const mirror = true;

        const fontMap = {

            'helvetiker': 0,
            'optimer': 1,
            'gentilis': 2,
            'droid/droid_sans': 3,
            'droid/droid_serif': 4

        };

        const weightMap = {

            'regular': 0,
            'bold': 1

        };

        const reverseFontMap = [];
        const reverseWeightMap = [];

        for ( const i in fontMap ) reverseFontMap[ fontMap[ i ] ] = i;
        for ( const i in weightMap ) reverseWeightMap[ weightMap[ i ] ] = i;

        let targetRotation = 0;
        let targetRotationOnPointerDown = 0;

        let pointerX = 0;
        let pointerXOnPointerDown = 0;

        let windowHalfX = window.innerWidth / 2;

        let fontIndex = 1;

        init();
        animate();

        function init() {

            container = document.createElement( 'div' );
            document.body.appendChild( container );

            // CAMERA

            camera = new THREE.PerspectiveCamera( 30, window.innerWidth / window.innerHeight, 1, 1500 );
            camera.position.set( 0, 400, 700 );

            cameraTarget = new THREE.Vector3( 0, 150, 0 );

            // SCENE

            scene = new THREE.Scene();
            scene.background = new THREE.Color( 0x000000 );
            scene.fog = new THREE.Fog( 0x000000, 250, 1400 );

            // LIGHTS

            const dirLight = new THREE.DirectionalLight( 0xffffff, 0.4 );
            dirLight.position.set( 0, 0, 1 ).normalize();
            scene.add( dirLight );

            const pointLight = new THREE.PointLight( 0xffffff, 4.5, 0, 0 );
            pointLight.color.setHSL( Math.random(), 1, 0.5 );
            pointLight.position.set( 0, 100, 90 );
            scene.add( pointLight );

            materials = [
                new THREE.MeshPhongMaterial( { color: 0xffffff, flatShading: true } ), // front
                new THREE.MeshPhongMaterial( { color: 0xffffff } ) // side
            ];

            group = new THREE.Group();
            group.position.y = 100;

            scene.add( group );

            loadFont();

            const plane = new THREE.Mesh(
                new THREE.PlaneGeometry( 10000, 10000 ),
                new THREE.MeshBasicMaterial( { color: 0xffffff, opacity: 0.5, transparent: true } )
            );
            plane.position.y = 100;
            plane.rotation.x = - Math.PI / 2;
            scene.add( plane );

            // RENDERER

            renderer = new THREE.WebGLRenderer( { antialias: true } );
            renderer.setPixelRatio( window.devicePixelRatio );
            renderer.setSize( window.innerWidth, window.innerHeight );
            container.appendChild( renderer.domElement );

            // EVENTS

            container.style.touchAction = 'none';
            container.addEventListener( 'pointerdown', onPointerDown );

            document.addEventListener( 'keypress', onDocumentKeyPress );
            document.addEventListener( 'keydown', onDocumentKeyDown );

            window.addEventListener( 'resize', onWindowResize );

        }

        function onWindowResize() {

            windowHalfX = window.innerWidth / 2;

            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();

            renderer.setSize( window.innerWidth, window.innerHeight );

        }

        //

        function onDocumentKeyDown( event ) {

            if ( firstLetter ) {

                firstLetter = false;
                text = '';

            }

            const keyCode = event.keyCode;

            // backspace

            if ( keyCode == 8 ) {

                event.preventDefault();

                text = text.substring( 0, text.length - 1 );
                refreshText();

                return false;

            }

        }

        function onDocumentKeyPress( event ) {

            const keyCode = event.which;

            // backspace

            if ( keyCode == 8 ) {

                event.preventDefault();

            } else {

                const ch = String.fromCharCode( keyCode );
                text += ch;

                refreshText();

            }

        }

        function loadFont() {
            const loader = new FontLoader();
            loader.load(  '/threeJsLearn/font/gentilis_bold.typeface.json', function ( response ) {

                font = response;

                refreshText();

            } );

        }

        function createText() {

            textGeo = new TextGeometry( text, {

                font: font,

                size: size,
                depth: depth,
                curveSegments: curveSegments,

                bevelThickness: bevelThickness,
                bevelSize: bevelSize,
                bevelEnabled: bevelEnabled

            } );

            textGeo.computeBoundingBox();

            const centerOffset = - 0.5 * ( textGeo.boundingBox.max.x - textGeo.boundingBox.min.x );

            textMesh1 = new THREE.Mesh( textGeo, materials );

            textMesh1.position.x = centerOffset;
            textMesh1.position.y = hover;
            textMesh1.position.z = 0;

            textMesh1.rotation.x = 0;
            textMesh1.rotation.y = Math.PI * 2;

            group.add( textMesh1 );

            if ( mirror ) {

                textMesh2 = new THREE.Mesh( textGeo, materials );

                textMesh2.position.x = centerOffset;
                textMesh2.position.y = - hover;
                textMesh2.position.z = depth;

                textMesh2.rotation.x = Math.PI;
                textMesh2.rotation.y = Math.PI * 2;

                group.add( textMesh2 );

            }

        }

        function refreshText() {

            group.remove( textMesh1 );
            if ( mirror ) group.remove( textMesh2 );

            if ( ! text ) return;

            createText();

        }

        function onPointerDown( event ) {

            if ( event.isPrimary === false ) return;

            pointerXOnPointerDown = event.clientX - windowHalfX;
            targetRotationOnPointerDown = targetRotation;

            document.addEventListener( 'pointermove', onPointerMove );
            document.addEventListener( 'pointerup', onPointerUp );

        }

        function onPointerMove( event ) {

            if ( event.isPrimary === false ) return;

            pointerX = event.clientX - windowHalfX;

            targetRotation = targetRotationOnPointerDown + ( pointerX - pointerXOnPointerDown ) * 0.02;

        }

        function onPointerUp() {

            if ( event.isPrimary === false ) return;

            document.removeEventListener( 'pointermove', onPointerMove );
            document.removeEventListener( 'pointerup', onPointerUp );

        }

        //

        function animate() {

            requestAnimationFrame( animate );

            render();

        }

        function render() {

            group.rotation.y += ( targetRotation - group.rotation.y ) * 0.05;

            camera.lookAt( cameraTarget );

            renderer.clear();
            renderer.render( scene, camera );

        }
    }
}

window.runThree = runThree



