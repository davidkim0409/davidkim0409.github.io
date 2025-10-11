/*-------------------------------------------------------------------------
Homework 02: Move Rectangle with Arrow Keys

Move the rectangle using the arrow keys.

Key bindings:
  Up Arrow    - Move Up
  Down Arrow  - Move Down
  Left Arrow  - Move Left
  Right Arrow - Move Right 
---------------------------------------------------------------------------*/
import { resizeAspectRatio, setupText } from '../util/util.js';
import { Shader, readShaderFile } from '../util/shader.js';

const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');
let shader;   // shader program
let vao;      // vertex array object

// Movement variables
let moveX = 0.0;
let moveY = 0.0;

// Speed variables
const moveSpeed = 0.01;

// Boundary variables
const boundaryX = 1.0 - 0.1; // Adjusted for rectangle width
const boundaryY = 1.0 - 0.1; // Adjusted for rectangle height

// Key states
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
};

function initWebGL() {
    if (!gl) {
        console.error('WebGL 2 is not supported by your browser.');
        return false;
    }

    canvas.width = 600;
    canvas.height = 600;

    resizeAspectRatio(gl, canvas);

    // Initialize WebGL settings
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 1.0); // Set clear color to black
    
    return true;
}

async function initShader() {
    const vertexShaderSource = await readShaderFile('shVert.glsl');
    const fragmentShaderSource = await readShaderFile('shFrag.glsl');
    shader = new Shader(gl, vertexShaderSource, fragmentShaderSource);
}

function setupKeyboardEvents() {
    document.addEventListener('keydown', (event) => {
        if (event.key in keys) {
            // KeyDown event
            keys[event.key] = true;
        }
    });

    document.addEventListener('keyup', (event) => {
        if (event.key in keys) {
            // KeyUp event
            keys[event.key] = false;
        }
    });
}

function setupBuffers() {
    const vertices = new Float32Array([
        -0.1, -0.1, 0.0,  // Bottom left: 0
         0.1, -0.1, 0.0,  // Bottom right: 1
         0.1, 0.1, 0.0, // Top right: 2
         -0.1, 0.1, 0.0   // Top left: 3
    ]);

    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    shader.setAttribPointer('aPos', 3, gl.FLOAT, false, 0, 0);
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);

    let color = [1.0, 0.0, 0.0, 1.0]; // default color: Red

    shader.setVec4("uColor", color);
    shader.setFloat("moveX", moveX);
    shader.setFloat("moveY", moveY);

    // Update movement based on key states
    if (keys.ArrowUp) moveY += moveSpeed;
    if (keys.ArrowDown) moveY -= moveSpeed;
    if (keys.ArrowLeft) moveX -= moveSpeed;
    if (keys.ArrowRight) moveX += moveSpeed;

    // Boundary checks
    if (moveX > boundaryX) moveX = boundaryX;
    if (moveX < -boundaryX) moveX = -boundaryX;
    if (moveY > boundaryY) moveY = boundaryY;
    if (moveY < -boundaryY) moveY = -boundaryY;

    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

    requestAnimationFrame(() => render());
}

async function main() {
    try {

        // WebGL 초기화
        if (!initWebGL()) {
            throw new Error('WebGL 초기화 실패');
        }

        // 셰이더 초기화
        await initShader();

        // setup text overlay (see util.js)
        setupText(canvas, "Use arrow keys to move the rectangle", 1);

        // 키보드 이벤트 설정
        setupKeyboardEvents();
        
        // 나머지 초기화
        setupBuffers(shader);
        shader.use();
        
        // 렌더링 시작
        render();

        return true;

    } catch (error) {
        console.error('Failed to initialize program:', error);
        alert('프로그램 초기화에 실패했습니다.');
        return false;
    }
}

// call main function
main().then(success => {
    if (!success) {
        console.log('프로그램을 종료합니다.');
        return;
    }
}).catch(error => {
    console.error('프로그램 실행 중 오류 발생:', error);
});
