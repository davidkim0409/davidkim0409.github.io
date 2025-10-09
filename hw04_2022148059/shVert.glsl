#version 300 es

layout(location = 0) in vec2 a_position;

uniform mat4 u_transform;

void main() {
    // 2D 위치를 4D 동차좌표로 변환하여 최종 위치 계산
    gl_Position = u_transform * vec4(a_position, 0.0, 1.0);
}