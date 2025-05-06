class Circle {
  constructor() {
    this.type = "circle";
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();
    this.segments = 10;
  }

  render() {
    var rgba = this.color;

    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

    let angleStep = 360 / this.segments;
    let radius = 0.5;

    for (var angle = 0; angle < 360; angle = angle + angleStep) {
      let angle1 = angle;
      let angle2 = angle + angleStep;

      let vec1 = [
        Math.cos((angle1 * Math.PI) / 180) * radius,
        Math.sin((angle1 * Math.PI) / 180) * radius,
      ];
      let vec2 = [
        Math.cos((angle2 * Math.PI) / 180) * radius,
        Math.sin((angle2 * Math.PI) / 180) * radius,
      ];

      let vertices = [0, 0, 0, vec1[0], vec1[1], 0, vec2[0], vec2[1], 0];
      drawTriangle3D(vertices);
    }
  }
}
