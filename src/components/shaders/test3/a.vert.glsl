attribute vec3 aPos;
attribute vec3 aColor;
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
varying vec3 vColor;
void main(void){
    gl_Position = uPMatrix * uMVMatrix * vec4(aPos, 1);
}