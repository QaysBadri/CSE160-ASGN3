class Cube {
  constructor() {
    this.type = "cube";
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();
    this.textureNum = -2;
  }

  render() {
    var rgba = this.color;

    gl.uniform1i(u_whichTexture, this.textureNum);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

    const uv00 = 0;
    const uv01 = 0;
    const uv10 = 1;
    const uv11 = 0;
    const uv02 = 0;
    const uv03 = 1;
    const uv12 = 1;
    const uv13 = 1;

    drawTriangle3DUV(
      [0, 0, 0, 1, 0, 0, 1, 1, 0],
      [uv00, uv01, uv10, uv11, uv12, uv13]
    );
    drawTriangle3DUV(
      [0, 0, 0, 1, 1, 0, 0, 1, 0],
      [uv00, uv01, uv12, uv13, uv02, uv03]
    );

    drawTriangle3DUV(
      [0, 0, 1, 1, 0, 1, 1, 1, 1],
      [uv00, uv01, uv10, uv11, uv12, uv13]
    );
    drawTriangle3DUV(
      [0, 0, 1, 1, 1, 1, 0, 1, 1],
      [uv00, uv01, uv12, uv13, uv02, uv03]
    );

    drawTriangle3DUV(
      [0, 1, 0, 0, 1, 1, 1, 1, 1],
      [uv00, uv01, uv02, uv03, uv12, uv13]
    );
    drawTriangle3DUV(
      [0, 1, 0, 1, 1, 1, 1, 1, 0],
      [uv00, uv01, uv12, uv13, uv10, uv11]
    );

    drawTriangle3DUV(
      [0, 0, 0, 1, 0, 0, 1, 0, 1],
      [uv00, uv01, uv10, uv11, uv12, uv13]
    );
    drawTriangle3DUV(
      [0, 0, 0, 1, 0, 1, 0, 0, 1],
      [uv00, uv01, uv12, uv13, uv02, uv03]
    );

    drawTriangle3DUV(
      [1, 0, 0, 1, 0, 1, 1, 1, 1],
      [uv00, uv01, uv10, uv11, uv12, uv13]
    );
    drawTriangle3DUV(
      [1, 0, 0, 1, 1, 1, 1, 1, 0],
      [uv00, uv01, uv12, uv13, uv02, uv03]
    );

    drawTriangle3DUV(
      [0, 0, 0, 0, 1, 0, 0, 1, 1],
      [uv00, uv01, uv02, uv03, uv12, uv13]
    );
    drawTriangle3DUV(
      [0, 0, 0, 0, 1, 1, 0, 0, 1],
      [uv00, uv01, uv12, uv13, uv10, uv11]
    );
  }
}
