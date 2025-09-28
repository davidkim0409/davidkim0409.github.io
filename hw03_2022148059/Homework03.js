/*-------------------------------------------------------------------------
Homework 03: Circle and Line Segment Intersection

left mouse button을 click하면 원을 그리고, 다시 left mouse button을 click하면 선분을 그린다.
원과 선분이 교차하는지 검사하고, 교차한다면 교차점을 표시한다.
---------------------------------------------------------------------------*/
import { resizeAspectRatio, setupText, updateText, Axes } from '../util/util.js';
import { Shader, readShaderFile } from '../util/shader.js';

// Global variables
const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');
let isInitialized = false;  // main이 실행되는 순간 true로 change
let shader;
let vao;
let positionBuffer; // 2D position을 위한 VBO (Vertex Buffer Object)
let isDrawing = false; // mouse button을 누르고 있는 동안 true로 change
let startPoint = null;  // mouse button을 누른 위치
let tempEndPoint = null; // mouse를 움직이는 동안의 위치
let lines = []; // 그려진 선분들을 저장하는 array
let textOverlay; // 1st line segment 정보 표시
let textOverlay2; // 2nd line segment 정보 표시
let textOverlay3; // 3rd line intersection point 정보 표시
let axes = new Axes(gl, 0.85); // x, y axes 그려주는 object (see util.js)

const numSegments = 100; // axes를 그릴 때 사용하는 line segment의 개수

// DOMContentLoaded event
// 1) 모든 HTML 문서가 완전히 load되고 parsing된 후 발생
// 2) 모든 resource (images, css, js 등) 가 완전히 load된 후 발생
// 3) 모든 DOM 요소가 생성된 후 발생
// DOM: Document Object Model로 HTML의 tree 구조로 표현되는 object model 
// 모든 code를 이 listener 안에 넣는 것은 mouse click event를 원활하게 처리하기 위해서임
// mouse input을 사용할 때 이와 같이 main을 call 한다. 

document.addEventListener('DOMContentLoaded', () => {
    if (isInitialized) { // true인 경우는 main이 이미 실행되었다는 뜻이므로 다시 실행하지 않음
        console.log("Already initialized");
        return;
    }

    main().then(success => { // call main function
        if (!success) {
            console.log('프로그램을 종료합니다.');
            return;
        }
        isInitialized = true;
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
    gl.clearColor(0.1, 0.2, 0.3, 1.0);

    return true;
}

function setupBuffers() {
    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    shader.setAttribPointer('a_position', 2, gl.FLOAT, false, 0, 0); // x, y 2D 좌표

    gl.bindVertexArray(null);
}

// 좌표 변환 함수: 캔버스 좌표를 WebGL 좌표로 변환
// 캔버스 좌표: 캔버스 좌측 상단이 (0, 0), 우측 하단이 (canvas.width, canvas.height)
// WebGL 좌표 (NDC): 캔버스 좌측 하단이 (-1, -1), 우측 상단이 (1, 1)
function convertToWebGLCoordinates(x, y) {
    return [
        (x / canvas.width) * 2 - 1,  // x/canvas.width 는 0 ~ 1 사이의 값, 이것을 * 2 - 1 하면 -1 ~ 1 사이의 값
        -((y / canvas.height) * 2 - 1) // y canvas 좌표는 상하를 뒤집어 주어야 하므로 -1을 곱함
    ];
}

/* 
    browser window
    +----------------------------------------+
    | toolbar, address bar, etc.             |
    +----------------------------------------+
    | browser viewport (컨텐츠 표시 영역)       | 
    | +------------------------------------+ |
    | |                                    | |
    | |    canvas                          | |
    | |    +----------------+              | |
    | |    |                |              | |
    | |    |      *         |              | |
    | |    |                |              | |
    | |    +----------------+              | |
    | |                                    | |
    | +------------------------------------+ |
    +----------------------------------------+

    *: mouse click position

    event.clientX = browser viewport 왼쪽 경계에서 마우스 클릭 위치까지의 거리
    event.clientY = browser viewport 상단 경계에서 마우스 클릭 위치까지의 거리
    rect.left = browser viewport 왼쪽 경계에서 canvas 왼쪽 경계까지의 거리
    rect.top = browser viewport 상단 경계에서 canvas 상단 경계까지의 거리

    x = event.clientX - rect.left  // canvas 내에서의 클릭 x 좌표
    y = event.clientY - rect.top   // canvas 내에서의 클릭 y 좌표
*/

function setupMouseEvents() {
    function handleMouseDown(event) {
        event.preventDefault(); // 이미 존재할 수 있는 기본 동작을 방지
        event.stopPropagation(); // event가 상위 요소 (div, body, html 등)으로 전파되지 않도록 방지

        const rect = canvas.getBoundingClientRect(); // canvas를 나타내는 rect 객체를 반환
        const x = event.clientX - rect.left;  // canvas 내 x 좌표
        const y = event.clientY - rect.top;   // canvas 내 y 좌표
        
        if (!isDrawing && lines.length < 2) { 
            // 1번 또는 2번 선분을 그리고 있는 도중이 아닌 경우 (즉, mouse down 상태가 아닌 경우)
            // 캔버스 좌표를 WebGL 좌표로 변환하여 선분의 시작점을 설정
            let [glX, glY] = convertToWebGLCoordinates(x, y);
            startPoint = [glX, glY];
            isDrawing = true; // 이제 mouse button을 놓을 때까지 계속 true로 둠. 즉, mouse down 상태가 됨
        }
    }

    function handleMouseMove(event) {
        if (isDrawing) { // 1번 또는 2번 선분을 그리고 있는 도중인 경우
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            let [glX, glY] = convertToWebGLCoordinates(x, y);
            tempEndPoint = [glX, glY]; // 임시 선분의 끝 point
            render();
        }
    }

    function handleMouseUp() {
        if (isDrawing && tempEndPoint) {

            // lines.push([...startPoint, ...tempEndPoint])
            //   : startPoint와 tempEndPoint를 펼쳐서 하나의 array로 합친 후 lines에 추가
            // ex) lines = [] 이고 startPoint = [1, 2], tempEndPoint = [3, 4] 이면,
            //     lines = [[1, 2, 3, 4]] 이 됨
            // ex) lines = [[1, 2, 3, 4]] 이고 startPoint = [5, 6], tempEndPoint = [7, 8] 이면,
            //     lines = [[1, 2, 3, 4], [5, 6, 7, 8]] 이 됨

            lines.push([...startPoint, ...tempEndPoint]); 

            if (lines.length == 1) { // 원인 경우
                updateText(textOverlay, "Circle: center (" + lines[0][0].toFixed(2) + ", " + lines[0][1].toFixed(2) + 
                    ") radius = " + Math.sqrt(Math.pow((lines[0][2] - lines[0][0]), 2) + Math.pow((lines[0][3] - lines[0][1]), 2)).toFixed(2));
            }
            else { // lines.length == 2
                updateText(textOverlay2, "Line segment: (" + lines[1][0].toFixed(2) + ", " + lines[1][1].toFixed(2) + 
                    ") ~ (" + lines[1][2].toFixed(2) + ", " + lines[1][3].toFixed(2) + ")");    
            }

            isDrawing = false;
            startPoint = null;
            tempEndPoint = null;
            render();
        }
    }

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
}

function calculateDistance(point1, point2) {
    return Math.sqrt(Math.pow((point2[0] - point1[0]), 2) + Math.pow((point2[1] - point1[1]), 2));
}

function generateCircleVerticies(center, radius, numSegments) {
    let vertices = [];

    for (let i = 0; i <= numSegments; i++) {
        let angle = (i / numSegments) * 2 * Math.PI;
        let x = center[0] + radius * Math.cos(angle);
        let y = center[1] + radius * Math.sin(angle);
        vertices.push(x, y);
    }
    return vertices;
}

function intersectCirclewithLineSegment(circle, line) {
    let [cx, cy, r] = circle; // circle: [centerX, centerY, radius]
    let [x1, y1, x2, y2] = line; // line: [x1, y1, x2, y2]
    let dx = x2 - x1;
    let dy = y2 - y1;
    let a = dx * dx + dy * dy;
    let b = 2 * (dx * (x1 - cx) + dy * (y1 - cy));
    let c = (x1 - cx) * (x1 - cx) + (y1 - cy) * (y1 - cy) - r * r;
    let discriminant = b * b - 4 * a * c; // 판별식

    if (Math.abs(discriminant) <= 0.000001) { // 정밀도 고려
        let t = -b / (2 * a); // 중근
        if (t >= 0 && t <= 1) {
            return [[x1 + t * dx, y1 + t * dy]]; // 한 점에서 접하는 경우
        } else {
            return []; // 선분 위에 접점이 없는 경우
        }
        
    } else {
        let points = [];
        // 근의 공식
        let t1 = (-b + Math.sqrt(discriminant)) / (2 * a);
        let t2 = (-b - Math.sqrt(discriminant)) / (2 * a);

        // t가 0과 1 사이에 있는지 (선분 위에 있는지) 확인, 있으면 points에 추가
        if (t1 >= 0 && t1 <= 1) {
            points.push([x1 + t1 * dx, y1 + t1 * dy]);
        }
        if (t2 >= 0 && t2 <= 1) {
            points.push([x1 + t2 * dx, y1 + t2 * dy]);
        }

        return points;
    }
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    shader.use();
    
    // 저장된 원과 선 그리기
    let num = 0;
    for (let line of lines) {
        if (num == 0) { // 원인 경우
            shader.setVec4("u_color", [1.0, 0.0, 1.0, 1.0]); // 원의 color는 magenta
            
            let radius = calculateDistance([line[0], line[1]], [line[2], line[3]]);
            let vertices = generateCircleVerticies([line[0], line[1]], radius, numSegments);

            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
            gl.bindVertexArray(vao);
            gl.drawArrays(gl.LINE_LOOP, 0, numSegments);
        }
        else { // num == 1 : 선분인 경우
            shader.setVec4("u_color", [0.0, 0.0, 1.0, 1.0]); // 선분의 color는 blue

            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(line), gl.STATIC_DRAW);
            gl.bindVertexArray(vao);
            gl.drawArrays(gl.LINES, 0, 2);
        }
        num++;
    }

    // 임시 원과 선 그리기
    if (isDrawing && startPoint && tempEndPoint) {
        shader.setVec4("u_color", [0.5, 0.5, 0.5, 1.0]); // 임시 원의 color는 회색

        if (lines.length == 0) { // 원인 경우
            let radius = calculateDistance(startPoint, tempEndPoint);
            let vertices = generateCircleVerticies(startPoint, radius, numSegments);

            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
            gl.bindVertexArray(vao);
            gl.drawArrays(gl.LINE_LOOP, 0, numSegments);
        }
        else { // lines.length == 1 : 선분인 경우
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([...startPoint, ...tempEndPoint]), gl.STATIC_DRAW);
            gl.bindVertexArray(vao);
            gl.drawArrays(gl.LINES, 0, 2);
        }
    }

    // Intersection point 표시
    if (lines.length == 2) { // 원과 선분 모두 그린 후
        let circle = [lines[0][0], lines[0][1], calculateDistance([lines[0][0], lines[0][1]], [lines[0][2], lines[0][3]])];
        let line = lines[1];
        let intersectionPoints = intersectCirclewithLineSegment(circle, line);

        // intersectionPoints의 개수에 따라 textOverlay3 업데이트
        if (intersectionPoints.length == 0) { // 근이 없음
            updateText(textOverlay3, "No intersection");
        }
        else if (intersectionPoints.length == 1) { // 중근
            updateText(textOverlay3, "Intersection Points: " + intersectionPoints.length + " Point 1: (" + intersectionPoints[0][0].toFixed(2) + ", " + intersectionPoints[0][1].toFixed(2) + ")");
        }
        else { // intersectionPoints.length == 2: 근이 2개
            updateText(textOverlay3, "Intersection Points: " + intersectionPoints.length + " Point 1: (" + intersectionPoints[0][0].toFixed(2) + ", " + intersectionPoints[0][1].toFixed(2) + 
                ") Point 2: (" + intersectionPoints[1][0].toFixed(2) + ", " + intersectionPoints[1][1].toFixed(2) + ")");
        }

        shader.setVec4("u_color", [1.0, 1.0, 0.0, 1.0]); // intersection point의 color는 yellow
        let vertices = [];
        for (let point of intersectionPoints) {
            vertices.push(point[0], point[1]);
        }
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        gl.bindVertexArray(vao);
        gl.drawArrays(gl.POINTS, 0, intersectionPoints.length);
        
    }

    // axes 그리기
    axes.draw(mat4.create(), mat4.create()); // 두 개의 identity matrix를 parameter로 전달

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
            return false; 
        }

        // 셰이더 초기화
        await initShader();
        
        // 나머지 초기화
        setupBuffers();
        shader.use();

        // 텍스트 초기화
        textOverlay = setupText(canvas, "", 1);
        textOverlay2 = setupText(canvas, "", 2);
        textOverlay3 = setupText(canvas, "", 3);

        // 마우스 이벤트 설정
        setupMouseEvents();
        
        // 초기 렌더링
        render();

        return true;
        
    } catch (error) {
        console.error('Failed to initialize program:', error);
        alert('프로그램 초기화에 실패했습니다.');
        return false;
    }
}
