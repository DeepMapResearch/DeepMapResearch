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
        this.data = data; // Now may be an object containing prompt, node_depth, and node_branch

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
controls.minDistance = 1;
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

function animateCameraMove(fromPos, toPos, fromTarget, toTarget, duration, onComplete) {
    const startTime = performance.now();
    function update() {
        if (window.iscancelAnimation) {
            window.iscancelAnimation = false; // reset the cancellation flag
            return; // cancel the animation
        }
        const now = performance.now();
        let t = (now - startTime) / duration;
        if (t > 1) t = 1;
        camera.position.lerpVectors(fromPos, toPos, t);
        controls.target.lerpVectors(fromTarget, toTarget, t);
        if (t < 1) {
            requestAnimationFrame(update);
        } else if (onComplete) {
            onComplete();
        }
    }
    requestAnimationFrame(update);
}

function cancelAnimation() {
    window.iscancelAnimation = true;
    console.log('Animation cancelled!');
}


window.addEventListener('mousedown', cancelAnimation, { capture: true });
window.addEventListener('wheel', cancelAnimation, { capture: true });
window.addEventListener('touchstart', cancelAnimation, { capture: true });




animate();

class TreeExample {
    constructor(max_depth, initial_length) {
        this.max_depth = max_depth;
        this.initial_length = initial_length;

        // Root node with data
        this.root = new Sphere(new THREE.Vector3(0, 0, 0), 0.5, 0xff22fa, "Root Node Data");
        
        const initialAngle = Math.PI/6;
        const axis = new THREE.Vector3(1, 0, 0);

        const dir1 = new THREE.Vector3(0, 1, 0)
            .applyAxisAngle(axis, initialAngle)
            .normalize();
        
        const dir2 = new THREE.Vector3(0, 1, 0)
            .applyAxisAngle(axis, -initialAngle)
            .normalize();

        this.buildTree(this.root.position, dir1, initial_length, 0);
        this.buildTree(this.root.position, dir2, initial_length, 0);
    }

    buildTree(parentPos, parentDir, currentLength, currentDepth) {
        if (currentDepth >= this.max_depth) return;

        const childPos = parentPos.clone().add(parentDir.clone().multiplyScalar(currentLength));
        const branchThickness = 0.3 * Math.pow(0.7, currentDepth);
        new Branch(parentPos, childPos, branchThickness, 0x1e1bfa);

        const sphereSize = 0.3 * Math.pow(0.7, currentDepth);
        // Add node with depth-based data
        new Sphere(childPos, sphereSize, 0xff22fa, `Node at depth ${currentDepth + 1}`);

        const nextLength = currentLength * 0.7;
        const branchAngle = Math.PI/5;

        const axis = currentDepth % 2 === 0 
            ? new THREE.Vector3(0, 0, 1)
            : new THREE.Vector3(1, 0, 0);

        const dir1 = parentDir.clone()
            .applyAxisAngle(axis, branchAngle)
            .normalize();
        
        const dir2 = parentDir.clone()
            .applyAxisAngle(axis, -branchAngle)
            .normalize();

        this.buildTree(childPos, dir1, nextLength, currentDepth + 1);
        this.buildTree(childPos, dir2, nextLength, currentDepth + 1);
    }
}

class Tree {
    constructor(treeData, initial_length) {
        this.initial_length = initial_length;
        // Create the root sphere with its prompt data and added fields:
        // node_depth is 0 and node_branch is 0 (for the root)
        this.root = new Sphere(
            new THREE.Vector3(0, 0, 0),
            0.5,
            0x9b02f5,
            { prompt: treeData.prompt, node_depth: 0, node_branch: 0 }
        );
        // The initial growth direction is upward.
        const initialDir = new THREE.Vector3(0, 1, 0);
        // Begin recursively building the tree from the root.
        this.buildTree(this.root.position, initialDir, initial_length, treeData.branches, 0);
    }

    buildTree(parentPos, parentDir, currentLength, branchesData, currentDepth) {
        if (!branchesData || branchesData.length === 0) return;

        // Define a constant tilt (branch angle) for children relative to the parent's direction.
        const branchAngle = Math.PI / 5;

        // Establish an orthonormal basis (u, v) perpendicular to parentDir.
        let u = new THREE.Vector3();
        if (Math.abs(parentDir.x) < 0.0001 && Math.abs(parentDir.z) < 0.0001) {
            u.set(1, 0, 0); // Use the x-axis if parentDir is nearly vertical.
        } else {
            u.copy(new THREE.Vector3(0, 1, 0)).cross(parentDir).normalize();
        }
        const v = new THREE.Vector3().copy(parentDir).cross(u).normalize();

        const count = branchesData.length;
        // Distribute the branches evenly around the cone.
        for (let i = 0; i < count; i++) {
            // Evenly divide the full circle and add an offset based on the current depth so that each level rotates.
            const phi = (2 * Math.PI * i) / count + (currentDepth * Math.PI / 6);

            // Compute the new branch direction using spherical coordinates.
            const newDir = new THREE.Vector3()
                .copy(parentDir)
                .multiplyScalar(Math.cos(branchAngle));

            const offset = new THREE.Vector3()
                .copy(u).multiplyScalar(Math.cos(phi))
                .add(new THREE.Vector3().copy(v).multiplyScalar(Math.sin(phi)))
                .multiplyScalar(Math.sin(branchAngle));

            newDir.add(offset).normalize();

            // Determine the child's position.
            const childPos = parentPos.clone().add(newDir.clone().multiplyScalar(currentLength));

            // Scale the branch thickness and sphere size based on the depth.
            const branchThickness = 0.3 * Math.pow(0.7, currentDepth);
            new Branch(parentPos, childPos, branchThickness, 0x1e1bfa);

            const sphereSize = 0.3 * Math.pow(0.7, currentDepth);
            // Pass an object containing the prompt, node_depth, and node_branch.
            new Sphere(
                childPos,
                sphereSize,
                0xff22fa,
                { prompt: branchesData[i].prompt, node_depth: currentDepth + 1, node_branch: i }
            );

            // Recursively build the subtree for this branch.
            this.buildTree(childPos, newDir, currentLength * 0.7, branchesData[i].branches, currentDepth + 1);
        }
    }
}


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

    // Reset all spheres to their original color.
    spheres.forEach(sphere => {
        sphere.edit({ color: sphere.originalColor });
    });

    if (intersects.length > 0) {
        const selectedObject = intersects[0].object;
        const contentDiv = document.getElementById('content');

        let targetSphere = null;

        // Check if a sphere was directly selected.
        const selectedSphere = spheres.find(sphere => sphere.mesh === selectedObject);
        if (selectedSphere) {
            selectedSphere.edit({ color: 0xffffff });
            // If the data is an object, display its fields nicely.
            if (typeof selectedSphere.data === 'object') {
                contentDiv.innerText =
                    `Prompt: ${selectedSphere.data.prompt}\n` +
                    `Depth: ${selectedSphere.data.node_depth}\n` +
                    `Branch: ${selectedSphere.data.node_branch}`;
            } else {
                contentDiv.innerText = selectedSphere.data;
            }
            targetSphere = selectedSphere;
        } else {
            // Otherwise check if a branch was selected and then get its endpoint.
            const selectedBranch = branches.find(branch => branch.mesh === selectedObject);
            if (selectedBranch) {
                const endSphere = spheres.find(sphere =>
                    sphere.position.distanceTo(selectedBranch.end) < 0.1
                );
                if (endSphere) {
                    endSphere.edit({ color: 0xffffff });
                    if (typeof endSphere.data === 'object') {
                        contentDiv.innerText =
                            `Prompt: ${endSphere.data.prompt}\n` +
                            `Depth: ${endSphere.data.node_depth}\n` +
                            `Branch: ${endSphere.data.node_branch}`;
                    } else {
                        contentDiv.innerText = endSphere.data;
                    }
                    targetSphere = endSphere;
                }
            }
        }

        // If we found a sphere (either directly or via a branch endpoint),
        // animate the camera so that it moves to a position relative to the sphere
        // and update the OrbitControls target.
        if (targetSphere) {
            const targetPos = targetSphere.mesh.position.clone();

            // Compute a new camera position: here we keep the same offset direction
            // as before but reposition it so that its distance from the new target is maintained.
            const currentOffset = camera.position.clone().sub(controls.target);
            const desiredDistance = currentOffset.length(); // or use a fixed value (e.g. 10)
            const newCamPos = targetPos.clone().add(currentOffset.normalize().multiplyScalar(desiredDistance));

            // Animate the camera move over 1 second (1000 ms).
            animateCameraMove(
                camera.position.clone(),
                newCamPos,
                controls.target.clone(),
                targetPos,
                1000,
                () => {
                    // Once the camera has moved, you can set a nonzero autoRotate speed
                    // so that the camera begins to orbit around the selected node.
                    controls.autoRotateSpeed = 0; // adjust this value as desired
                }
            );
        }
    }
});


const treeData = {
    "prompt": "Root Node Data",
    "branches": [
      {
        "prompt": "Node at depth 1 - 1",
        "branches": [
          {
            "prompt": "Node at depth 2 - 1",
            "branches": [
              {
                "prompt": "Node at depth 3 - 1",
                "branches": [
                  {
                    "prompt": "Node at depth 4 - 1",
                    "branches": [
                      {
                        "prompt": "Node at depth 5 - 1",
                        "branches": [
                          {
                            "prompt": "Node at depth 6 - 1",
                            "branches": []
                          }
                        ]
                      },
                      {
                        "prompt": "Node at depth 5 - 2",
                        "branches": []
                      }
                    ]
                  },
                  {
                    "prompt": "Node at depth 4 - 2",
                    "branches": []
                  }
                ]
              }
            ]
          },
          {
            "prompt": "Node at depth 2 - 2",
            "branches": []
          }
        ]
      },
      {
        "prompt": "Node at depth 1 - 2",
        "branches": [
          {
            "prompt": "Node at depth 2 - 3",
            "branches": [
              {
                "prompt": "Node at depth 3 - 2",
                "branches": []
              },
              {
                "prompt": "Node at depth 3 - 3",
                "branches": [
                  {
                    "prompt": "Node at depth 4 - 3",
                    "branches": [
                      {
                        "prompt": "Node at depth 5 - 3",
                        "branches": [
                          {
                            "prompt": "Node at depth 6 - 2",
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
      },
      {
        "prompt": "Node at depth 1 - 3",
        "branches": []
      },
      {
        "prompt": "Node at depth 1 - 4",
        "branches": [
          {
            "prompt": "Node at depth 2 - 4",
            "branches": [
              {
                "prompt": "Node at depth 3 - 4",
                "branches": [
                  {
                    "prompt": "Node at depth 4 - 4",
                    "branches": []
                  }
                ]
              }
            ]
          },
          {
            "prompt": "Node at depth 2 - 5",
            "branches": []
          }
        ]
      },
      {
        "prompt": "Node at depth 1 - 5",
        "branches": [
          {
            "prompt": "Node at depth 2 - 6",
            "branches": [
              {
                "prompt": "Node at depth 3 - 5",
                "branches": [
                  {
                    "prompt": "Node at depth 4 - 5",
                    "branches": [
                      {
                        "prompt": "Node at depth 5 - 5",
                        "branches": [
                          {
                            "prompt": "Node at depth 6 - 3",
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
    ]
  };
  
  function generateBinaryTreeData(maxDepth, currentDepth = 0, id = 1) {
    const node = {
      prompt: currentDepth === 0 ? "Root Node Data" : `Node ${id} at depth ${currentDepth}`,
      branches: []
    };
    if (currentDepth < maxDepth) {
      // Always branch to two children.
      node.branches.push(generateBinaryTreeData(maxDepth, currentDepth + 1, id * 2));
      node.branches.push(generateBinaryTreeData(maxDepth, currentDepth + 1, id * 2 + 1));
    }
    return node;
  }
  
  const treeDataB = generateBinaryTreeData(4);

const myTree = new Tree(treeDataB, 3);
