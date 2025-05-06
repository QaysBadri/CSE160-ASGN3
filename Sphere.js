class Sphere {
  constructor() {
    this.type = "sphere";
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();
    this.textureNum = -1;
    this.segments = 12;
    this.bands = 8;
  }

  render() {
    var rgba = this.color;

    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

    let latAngleStep = 180 / this.bands;
    let lonAngleStep = 360 / this.segments;
    let radius = 0.5;

    for (let i = 0; i < this.bands; i++) {
      for (let j = 0; j < this.segments; j++) {
        let lat1 = 90 - i * latAngleStep;
        let lat2 = 90 - (i + 1) * latAngleStep;
        let lon1 = j * lonAngleStep;
        let lon2 = lon1 + lonAngleStep;

        let v1 = this.sphericalToCartesian(radius, lat1, lon1);
        let v2 = this.sphericalToCartesian(radius, lat2, lon1);
        let v3 = this.sphericalToCartesian(radius, lat2, lon2);
        let v4 = this.sphericalToCartesian(radius, lat1, lon2);

        drawTriangle3D([
          v1[0],
          v1[1],
          v1[2],
          v2[0],
          v2[1],
          v2[2],
          v4[0],
          v4[1],
          v4[2],
        ]);
        drawTriangle3D([
          v2[0],
          v2[1],
          v2[2],
          v3[0],
          v3[1],
          v3[2],
          v4[0],
          v4[1],
          v4[2],
        ]);
      }
    }
  }

  sphericalToCartesian(r, latitude, longitude) {
    let latRad = (latitude * Math.PI) / 180;
    let lonRad = (longitude * Math.PI) / 180;

    let x = r * Math.cos(latRad) * Math.cos(lonRad);
    let y = r * Math.sin(latRad);
    let z = r * Math.cos(latRad) * Math.sin(lonRad);

    return [x, y, z];
  }
}
