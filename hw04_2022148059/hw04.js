// 'Axes'를 import 목록에서 제거
import { resizeAspectRatio } from './util.js';
import { Shader, readShaderFile } from './shader.js';

let isInitialized = false;
const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');
let shader;
let objects = {}; //그릴 사각형 3종류 buffer에 저장
let startTime = 0;

document.addEventListener('DOMContentLoaded', () => {
    if (isInitialized) {
        console.log("Already initialized");
        return;
    }

    main().then(success => {
        if (!success) {
            console.log('프로그램을 종료합니다.');
            return;
        }
        isInitialized = true;
        requestAnimationFrame(animate);
    }).catch(error => {
        console.error('프로그램 실행 중 오류 발생:', error);
    });
});

function initWebGL() {
    if (!gl) {
        console.error('WebGL 2 is not supported by your browser.');
        return false;
    }

    canvas.width = 700;
    canvas.height = 700;
    resizeAspectRatio(gl, canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.2, 0.3, 0.4, 1.0);

    return true;
}

function setupBuffers() {
    //직사각형 그리는 함수
    function createQuad(width, height) {
        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        const w = width / 2; 
        const h = height / 2;
        const vertices = new Float32Array([-w, -h, w, -h, w, h, -w, h]);
        const vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(0);
        gl.bindVertexArray(null);
        return { vao: vao, vertexCount: 4 };
    }
    //기둥이랑 날개 한종류씩 버퍼에 저장
    return {
        pillar: createQuad(0.3, 0.8),
        mainWing: createQuad(0.6, 0.2),
        subWing: createQuad(0.2, 0.1)
    };
}

function drawObject(obj, modelMatrix, color) {
    shader.setMat4("u_transform", modelMatrix);
    shader.setVec4("u_color", color);
    gl.bindVertexArray(obj.vao);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, obj.vertexCount);
    gl.bindVertexArray(null);
}

function render(elapsedTime) {
    gl.clear(gl.COLOR_BUFFER_BIT);
    shader.use();

    // 1. 중앙 기둥
    const pillarModelMatrix = mat4.create();
    drawObject(objects.pillar, pillarModelMatrix, [0.4, 0.3, 0.1, 1.0]);

    // 2. 큰 날개 회전
    const mainWingAngle = Math.sin(elapsedTime) * Math.PI * 2.0;

    // 2-1. 큰 날개
    const mainWingModelMatrix = mat4.create();
    mat4.translate(mainWingModelMatrix, mainWingModelMatrix, [0, 0.4, 0]);
    mat4.rotate(mainWingModelMatrix, mainWingModelMatrix, mainWingAngle, [0, 0, 1]);
    drawObject(objects.mainWing, mainWingModelMatrix, [0.9, 0.9, 0.9, 1.0]);

    // 3. 작은 날개 회전
    const subWingAngle = Math.sin(elapsedTime) * Math.PI * -10.0;

    // 3-1. 왼쪽 작은 날개
    const leftsubWingModelMatrix = mat4.clone(mainWingModelMatrix);
    mat4.translate(leftsubWingModelMatrix, leftsubWingModelMatrix, [-0.3, 0.0, 0.0]);
    mat4.rotate(leftsubWingModelMatrix, leftsubWingModelMatrix, subWingAngle, [0, 0, 1]);
    drawObject(objects.subWing, leftsubWingModelMatrix, [0.7, 0.7, 0.7, 1.0]);
    
    // 3-2. 오른쪽 작은 날개
    const rightsubWingModelMatrix = mat4.clone(mainWingModelMatrix);
    mat4.translate(rightsubWingModelMatrix, rightsubWingModelMatrix, [0.3, 0.0, 0.0]);
    mat4.rotate(rightsubWingModelMatrix, rightsubWingModelMatrix, subWingAngle, [0, 0, 1]);
    drawObject(objects.subWing, rightsubWingModelMatrix, [0.7, 0.7, 0.7, 1.0]);
}

function animate(currentTime) {
    const elapsedTime = (currentTime - startTime) * 0.001;
    render(elapsedTime);
    requestAnimationFrame(animate);
}

async function initShader() {
    const vertexShaderSource = await readShaderFile('shVert.glsl');
    const fragmentShaderSource = await readShaderFile('shFrag.glsl');
    shader = new Shader(gl, vertexShaderSource, fragmentShaderSource);
}

async function main() {
    try {
        if (!initWebGL()) {
            throw new Error('WebGL 초기화 실패');
        }

        await initShader();
        objects = setupBuffers();
        return true;

    } catch (error) {
        console.error('프로그램 초기화 실패:', error);
        alert('프로그램 초기화에 실패했습니다.');
        return false;
    }
}
