#version 300 es
precision highp float;

uniform vec4 u_color; // 외부에서 색상 값을 받음

out vec4 fragColor;

void main() {
    fragColor = u_color;
}