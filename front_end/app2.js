import * as THREE from 'https://unpkg.com/three@0.126.1/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.126.1/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'https://unpkg.com/three@0.126.1/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://unpkg.com/three@0.126.1/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://unpkg.com/three@0.126.1/examples/jsm/postprocessing/UnrealBloomPass.js';

var branches = [];
var spheres = [];

class Branch {
    constructor(start, end, thickness, color = 0x1e1bfa) {
        this.start = start.clone();
        this.end = end.clone();
        this.thickness = thickness;
        this.color = color;

        this.geometry = new THREE.CylinderGeometry(0, this.thickness, 1, 32);
        this.material = new THREE.MeshStandardMaterial({
            color: this.color,
            emissive: this.color,
            emissiveIntensity: 2,
            metalness: 0,
            roughness: 0.1,
            transparent: true,
            opacity: 0.8
        });

        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.updateGeometry();
        scene.add(this.mesh);
        branches.push(this);
    }

    updateGeometry() {
        const direction = new THREE.Vector3().subVectors(this.end, this.start);
        const length = direction.length();
        this.geometry.scale(1, length, 1);
        this.mesh.position.lerpVectors(this.start, this.end, 0.5);
        const axis = new THREE.Vector3(0, 1, 0).cross(direction).normalize();
        const angle = Math.acos(direction.normalize().y);
        this.mesh.quaternion.setFromAxisAngle(axis, angle);
    }

    edit({ start, end, thickness, color }) {
        if (start) this.start.copy(start);
        if (end) this.end.copy(end);
        if (thickness !== undefined) {
            this.thickness = thickness;
            this.geometry = new THREE.CylinderGeometry(thickness, thickness, 1, 32);
            this.mesh.geometry = this.geometry;
        }
        if (color !== undefined) {
            this.color = color;
            this.material.color.set(this.color);
            this.material.emissive.set(this.color);
        }
        this.updateGeometry();
    }
}

class Sphere {
    constructor(position, radius = 0.5, color = 0xff22fa, data = "") {
        this.position = position.clone();
        this.radius = radius;
        this.color = color;
        this.originalColor = color;
        this.data = data;
        this.parent = null;

        this.geometry = new THREE.SphereGeometry(this.radius, 64, 64);
        this.material = new THREE.MeshStandardMaterial({
            color: this.color,
            emissive: this.color,
            emissiveIntensity: 1,
            metalness: 0,
            roughness: 0.1,
            transparent: true,
            opacity: 0.9
        });

        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.position.copy(this.position);
        scene.add(this.mesh);
        spheres.push(this);
    }

    edit({ position, radius, color }) {
        if (position) this.mesh.position.copy(position);
        if (radius !== undefined) {
            this.radius = radius;
            this.mesh.scale.set(radius, radius, radius);
        }
        if (color !== undefined) {
            this.color = color;
            this.material.color.set(this.color);
            this.material.emissive.set(this.color);
        }
    }
}

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// Post-processing
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    2.5,
    0.5,
    0.1
);
composer.addPass(bloomPass);

// Camera controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.autoRotate = true;
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.autoRotateSpeed = 0;
controls.maxPolarAngle = Math.PI/1.5;
controls.minDistance = 5;
controls.maxDistance = 30;

camera.position.set(15, 15, 15);
controls.target.set(0, 0, 0);
controls.update();

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    composer.render();
    controls.update();
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

animate();

class Tree {
    constructor(treeData) {
        this.treeData = treeData;

        // Create root sphere
        this.root = new Sphere(new THREE.Vector3(0, 0, 0), 0.5, 0xff22fa, treeData.prompt);
        this.root.parent = null;

        // Build the tree recursively
        this.buildTree(this.root, treeData.branches, 0);
    }

    buildTree(parentNode, branches, depth) {
        if (!branches || branches.length === 0) return;

        const numChildren = branches.length;
        const branchAngle = Math.PI / 6; // 30 degrees
        const length = 2 * Math.pow(0.7, depth);

        // Determine parent direction
        let parentDir;
        if (depth === 0) {
            parentDir = new THREE.Vector3(0, 1, 0);
        } else {
            const grandparentPos = parentNode.parent.position;
            parentDir = new THREE.Vector3().subVectors(parentNode.position, grandparentPos).normalize();
        }

        // Calculate rotation to align Y-axis with parent direction
        const yAxis = new THREE.Vector3(0, 1, 0);
        const rotationQuaternion = new THREE.Quaternion().setFromUnitVectors(yAxis, parentDir);

        branches.forEach((branchData, index) => {
            const phi = (2 * Math.PI * index) / numChildren;
            const theta = branchAngle;

            // Calculate local direction
            const localDirection = new THREE.Vector3(
                Math.sin(theta) * Math.cos(phi),
                Math.cos(theta),
                Math.sin(theta) * Math.sin(phi)
            ).normalize();

            // Rotate to global direction
            const globalDirection = localDirection.clone().applyQuaternion(rotationQuaternion).normalize();

            // Calculate child position
            const childPos = parentNode.position.clone().add(globalDirection.multiplyScalar(length));

            // Create branch
            const branchThickness = 0.3 * Math.pow(0.7, depth);
            new Branch(parentNode.position, childPos, branchThickness, 0x1e1bfa);

            // Create child sphere
            const sphereSize = 0.3 * Math.pow(0.7, depth);
            const childSphere = new Sphere(childPos, sphereSize, 0xff22fa, branchData.prompt);
            childSphere.parent = parentNode;

            // Recursively build child branches
            this.buildTree(childSphere, branchData.branches, depth + 1);
        });
    }
}

// Example JSON tree structure
const treeData = {
    "prompt": "Level",
    "branches": [
        {
            "prompt": "Level-1",
            "branches": [
                {
                    "prompt": "Level-1-1",
                    "branches": [
                        {
                            "prompt": "Level-1-1-1",
                            "branches": [
                                {
                                    "prompt": "Level-1-1-1-1",
                                    "branches": [
                                        {
                                            "prompt": "Level-1-1-1-1-1",
                                            "branches": []
                                        },
                                        {
                                            "prompt": "Level-1-1-1-1-2",
                                            "branches": []
                                        }
                                    ]
                                },
                                {
                                    "prompt": "Level-1-1-1-2",
                                    "branches": [
                                        {
                                            "prompt": "Level-1-1-1-2-1",
                                            "branches": []
                                        },
                                        {
                                            "prompt": "Level-1-1-1-2-2",
                                            "branches": []
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            "prompt": "Level-1-1-2",
                            "branches": [
                                {
                                    "prompt": "Level-1-1-2-1",
                                    "branches": [
                                        {
                                            "prompt": "Level-1-1-2-1-1",
                                            "branches": []
                                        },
                                        {
                                            "prompt": "Level-1-1-2-1-2",
                                            "branches": []
                                        }
                                    ]
                                },
                                {
                                    "prompt": "Level-1-1-2-2",
                                    "branches": [
                                        {
                                            "prompt": "Level-1-1-2-2-1",
                                            "branches": []
                                        },
                                        {
                                            "prompt": "Level-1-1-2-2-2",
                                            "branches": []
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                },
                {
                    "prompt": "Level-1-2",
                    "branches": [
                        {
                            "prompt": "Level-1-2-1",
                            "branches": [
                                {
                                    "prompt": "Level-1-2-1-1",
                                    "branches": [
                                        {
                                            "prompt": "Level-1-2-1-1-1",
                                            "branches": []
                                        },
                                        {
                                            "prompt": "Level-1-2-1-1-2",
                                            "branches": []
                                        }
                                    ]
                                },
                                {
                                    "prompt": "Level-1-2-1-2",
                                    "branches": [
                                        {
                                            "prompt": "Level-1-2-1-2-1",
                                            "branches": []
                                        },
                                        {
                                            "prompt": "Level-1-2-1-2-2",
                                            "branches": []
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            "prompt": "Level-1-2-2",
                            "branches": [
                                {
                                    "prompt": "Level-1-2-2-1",
                                    "branches": [
                                        {
                                            "prompt": "Level-1-2-2-1-1",
                                            "branches": []
                                        },
                                        {
                                            "prompt": "Level-1-2-2-1-2",
                                            "branches": []
                                        }
                                    ]
                                },
                                {
                                    "prompt": "Level-1-2-2-2",
                                    "branches": [
                                        {
                                            "prompt": "Level-1-2-2-2-1",
                                            "branches": []
                                        },
                                        {
                                            "prompt": "Level-1-2-2-2-2",
                                            "branches": []
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        },
        {
            "prompt": "Level-2",
            "branches": [
                {
                    "prompt": "Level-2-1",
                    "branches": [
                        {
                            "prompt": "Level-2-1-1",
                            "branches": [
                                {
                                    "prompt": "Level-2-1-1-1",
                                    "branches": [
                                        {
                                            "prompt": "Level-2-1-1-1-1",
                                            "branches": []
                                        },
                                        {
                                            "prompt": "Level-2-1-1-1-2",
                                            "branches": []
                                        }
                                    ]
                                },
                                {
                                    "prompt": "Level-2-1-1-2",
                                    "branches": [
                                        {
                                            "prompt": "Level-2-1-1-2-1",
                                            "branches": []
                                        },
                                        {
                                            "prompt": "Level-2-1-1-2-2",
                                            "branches": []
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            "prompt": "Level-2-1-2",
                            "branches": [
                                {
                                    "prompt": "Level-2-1-2-1",
                                    "branches": [
                                        {
                                            "prompt": "Level-2-1-2-1-1",
                                            "branches": []
                                        },
                                        {
                                            "prompt": "Level-2-1-2-1-2",
                                            "branches": []
                                        }
                                    ]
                                },
                                {
                                    "prompt": "Level-2-1-2-2",
                                    "branches": [
                                        {
                                            "prompt": "Level-2-1-2-2-1",
                                            "branches": []
                                        },
                                        {
                                            "prompt": "Level-2-1-2-2-2",
                                            "branches": []
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                },
                {
                    "prompt": "Level-2-2",
                    "branches": [
                        {
                            "prompt": "Level-2-2-1",
                            "branches": [
                                {
                                    "prompt": "Level-2-2-1-1",
                                    "branches": [
                                        {
                                            "prompt": "Level-2-2-1-1-1",
                                            "branches": []
                                        },
                                        {
                                            "prompt": "Level-2-2-1-1-2",
                                            "branches": []
                                        }
                                    ]
                                },
                                {
                                    "prompt": "Level-2-2-1-2",
                                    "branches": [
                                        {
                                            "prompt": "Level-2-2-1-2-1",
                                            "branches": []
                                        },
                                        {
                                            "prompt": "Level-2-2-1-2-2",
                                            "branches": []
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            "prompt": "Level-2-2-2",
                            "branches": [
                                {
                                    "prompt": "Level-2-2-2-1",
                                    "branches": [
                                        {
                                            "prompt": "Level-2-2-2-1-1",
                                            "branches": []
                                        },
                                        {
                                            "prompt": "Level-2-2-2-1-2",
                                            "branches": []
                                        }
                                    ]
                                },
                                {
                                    "prompt": "Level-2-2-2-2",
                                    "branches": [
                                        {
                                            "prompt": "Level-2-2-2-2-1",
                                            "branches": []
                                        },
                                        {
                                            "prompt": "Level-2-2-2-2-2",
                                            "branches": []
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ]
}

const myTree = new Tree(treeData);

// Sphere selection on click
window.addEventListener('click', (event) => {
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const sphereMeshes = spheres.map(sphere => sphere.mesh);
    const branchMeshes = branches.map(branch => branch.mesh);
    const allMeshes = [...sphereMeshes, ...branchMeshes];
    const intersects = raycaster.intersectObjects(allMeshes);

    spheres.forEach(sphere => {
        sphere.edit({ color: sphere.originalColor });
    });

    if (intersects.length > 0) {
        const selectedObject = intersects[0].object;
        const contentDiv = document.getElementById('content');

        // Handle sphere selection
        const selectedSphere = spheres.find(sphere => sphere.mesh === selectedObject);
        if (selectedSphere) {
            selectedSphere.edit({ color: 0xffffff });
            contentDiv.innerText = selectedSphere.data;
        } else {
            // Handle branch selection
            const selectedBranch = branches.find(branch => branch.mesh === selectedObject);
            if (selectedBranch) {
                const endSphere = spheres.find(sphere => 
                    sphere.position.distanceTo(selectedBranch.end) < 0.1
                );
                if (endSphere) {
                    endSphere.edit({ color: 0xffffff });
                    contentDiv.innerText = endSphere.data;
                }
            }
        }
    }
});