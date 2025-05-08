var VSHADER_SOURCE = `
    precision mediump float;
    attribute vec4 a_Position;
    attribute vec2 a_UV;
    varying vec2 v_UV;
    uniform mat4 u_ModelMatrix;
    uniform mat4 u_GlobalRotateMatrix;
    uniform mat4 u_ViewMatrix;
    uniform mat4 u_ProjectionMatrix;
    void main() {
      gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
      v_UV = a_UV;
  }`;

var FSHADER_SOURCE = `
  precision mediump float;
  varying vec2 v_UV;
  uniform vec4 u_FragColor;
  uniform sampler2D u_Sampler;
  uniform int u_whichTexture;
  void main() {
    if (u_whichTexture == -2) {
      gl_FragColor = u_FragColor;
    } else if (u_whichTexture == -1) {
      gl_FragColor = vec4(v_UV, 1.0, 1.0);
    } else if (u_whichTexture == 0) {
      gl_FragColor = texture2D(u_Sampler, v_UV);
    } else {
      gl_FragColor = vec4(1, 0.2, 0.2, 1);
    }
  }`;

let canvas,
  gl,
  a_Position,
  a_UV,
  u_FragColor,
  u_ModelMatrix,
  u_GlobalRotateMatrix,
  u_ViewMatrix,
  u_ProjectionMatrix,
  u_Sampler,
  u_whichTexture;

let g_skyTextureObject = null;
let g_grassTextureObject = null;

let g_globalAngle = 0;
let g_globalAngleX = 0;
let g_headAngle = 0;
let g_wingUpperAngle = 0;
let g_wingLowerAngle = 0;
let g_wingHandAngle = 0;

let g_headAnimation = true;
let g_wingUpperAnimation = false;
let g_wingLowerAnimation = false;
let g_wingHandAnimation = false;

let g_pokeAnimationActive = false;
let g_pokeStartTime = 0;
const g_pokeDuration = 0.5;

let g_isDragging = false;
let g_lastMouseX = -1;
let g_lastMouseY = -1;

var g_startTime = performance.now() / 1000.0;
var g_seconds = 0;

var g_eye = [0, 0.5, 3];
var g_at = [0, 0, 0];
var g_up = [0, 1, 0];

function setupWebGL() {
  canvas = document.getElementById("webgl");
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
  if (!gl) {
    console.log("Failed to get the rendering context for WebGL");
    return;
  }
  gl.enable(gl.DEPTH_TEST);
}

function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log("Failed to intialize shaders.");
    return;
  }
  a_Position = gl.getAttribLocation(gl.program, "a_Position");
  a_UV = gl.getAttribLocation(gl.program, "a_UV");
  u_FragColor = gl.getUniformLocation(gl.program, "u_FragColor");
  u_ModelMatrix = gl.getUniformLocation(gl.program, "u_ModelMatrix");
  u_GlobalRotateMatrix = gl.getUniformLocation(
    gl.program,
    "u_GlobalRotateMatrix"
  );
  u_ViewMatrix = gl.getUniformLocation(gl.program, "u_ViewMatrix");
  u_ProjectionMatrix = gl.getUniformLocation(gl.program, "u_ProjectionMatrix");
  u_Sampler = gl.getUniformLocation(gl.program, "u_Sampler");
  u_whichTexture = gl.getUniformLocation(gl.program, "u_whichTexture");

  if (
    a_Position < 0 ||
    a_UV < 0 ||
    !u_FragColor ||
    !u_ModelMatrix ||
    !u_GlobalRotateMatrix ||
    !u_ViewMatrix ||
    !u_ProjectionMatrix ||
    !u_Sampler ||
    !u_whichTexture
  ) {
    console.error(
      "Failed to get storage location of one or more GLSL variables."
    );
    console.log(
      "a_Position:",
      a_Position,
      "a_UV:",
      a_UV,
      "u_FragColor:",
      u_FragColor,
      "u_ModelMatrix:",
      u_ModelMatrix
    );
    console.log(
      "u_GlobalRotateMatrix:",
      u_GlobalRotateMatrix,
      "u_ViewMatrix:",
      u_ViewMatrix,
      "u_ProjectionMatrix:",
      u_ProjectionMatrix
    );
    console.log("u_Sampler:", u_Sampler, "u_whichTexture:", u_whichTexture);
    return;
  }
}

function addActionsForHtmlUI() {
  document.getElementById("angleSlide").addEventListener("input", function () {
    g_globalAngle = parseFloat(this.value);
  });

  document
    .getElementById("wingUpperSlide")
    .addEventListener("input", function () {
      if (!g_wingUpperAnimation) {
        g_wingUpperAngle = this.value;
      }
    });

  document
    .getElementById("wingLowerSlide")
    .addEventListener("input", function () {
      if (!g_wingLowerAnimation) {
        g_wingLowerAngle = this.value;
      }
    });

  document
    .getElementById("wingHandSlide")
    .addEventListener("input", function () {
      if (!g_wingHandAnimation) {
        g_wingHandAngle = this.value;
      }
    });

  document
    .getElementById("animationWingUpperOnButton")
    .addEventListener("click", function () {
      g_wingUpperAnimation = true;
    });
  document
    .getElementById("animationWingUpperOffButton")
    .addEventListener("click", function () {
      g_wingUpperAnimation = false;
    });

  document
    .getElementById("animationWingLowerOnButton")
    .addEventListener("click", function () {
      g_wingLowerAnimation = true;
    });
  document
    .getElementById("animationWingLowerOffButton")
    .addEventListener("click", function () {
      g_wingLowerAnimation = false;
    });

  document
    .getElementById("animationHandOnButton")
    .addEventListener("click", function () {
      g_wingHandAnimation = true;
    });
  document
    .getElementById("animationHandOffButton")
    .addEventListener("click", function () {
      g_wingHandAnimation = false;
    });
}

function initTextures() {
  g_skyTextureObject = loadSpecificTexture("images/sky.png");
  g_grassTextureObject = loadSpecificTexture("images/grass.png");

  if (u_Sampler) {
    gl.uniform1i(u_Sampler, 0);
  } else {
    console.error(
      "u_Sampler location not yet available in initTextures. Set gl.uniform1i(u_Sampler, 0) in main() or connectVariablesToGLSL()."
    );
  }
}

function loadSpecificTexture(imageSrc) {
  var texture = gl.createTexture();
  if (!texture) {
    console.error("Failed to create the texture object for: " + imageSrc);
    return null;
  }
  var image = new Image();
  if (!image) {
    console.error("Failed to create the image object for: " + imageSrc);
    return null;
  }
  image.onload = function () {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    console.log("Texture loaded successfully: " + imageSrc);
    gl.bindTexture(gl.TEXTURE_2D, null);
  };
  image.onerror = function () {
    console.error("Error loading image: " + imageSrc);
  };
  image.src = imageSrc;
  return texture;
}

function initEventHandlers() {
  canvas.onmousedown = function (ev) {
    if (ev.shiftKey && !g_pokeAnimationActive) {
      g_pokeAnimationActive = true;
      g_pokeStartTime = g_seconds;
    } else if (!ev.shiftKey) {
      g_isDragging = true;
      g_lastMouseX = ev.clientX;
      g_lastMouseY = ev.clientY;
    }
  };
  canvas.onmouseup = function (ev) {
    g_isDragging = false;
  };
  canvas.onmousemove = function (ev) {
    if (g_isDragging) {
      let deltaX = ev.clientX - g_lastMouseX;
      let deltaY = ev.clientY - g_lastMouseY;
      g_globalAngle = (g_globalAngle - deltaX * 0.4) % 360;
      g_globalAngleX = g_globalAngleX - deltaY * 0.4;
      g_globalAngleX = Math.max(Math.min(g_globalAngleX, 90), -90);
      g_lastMouseX = ev.clientX;
      g_lastMouseY = ev.clientY;
    }
  };
  canvas.oncontextmenu = function (ev) {
    ev.preventDefault();
  };
}

function main() {
  setupWebGL();
  connectVariablesToGLSL();
  addActionsForHtmlUI();
  initEventHandlers();
  document.onkeydown = keydown;
  initTextures();

  if (u_Sampler) {
    gl.uniform1i(u_Sampler, 0);
  }

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  requestAnimationFrame(tick);
}

function tick() {
  g_seconds = performance.now() / 1000.0 - g_startTime;
  updateAnimationAngles();
  renderAllShapes();
  requestAnimationFrame(tick);
}

function updateAnimationAngles() {
  if (g_pokeAnimationActive) {
    let pokeTime = g_seconds - g_pokeStartTime;
    let oscillation = Math.sin(pokeTime * ((2 * Math.PI) / g_pokeDuration));
    if (pokeTime < g_pokeDuration) {
      g_headAngle = 20 * oscillation;
      g_wingUpperAngle = 30 * oscillation;
      g_wingLowerAngle = -20 * oscillation;
      document.getElementById("wingUpperSlide").value = g_wingUpperAngle;
      document.getElementById("wingLowerSlide").value = g_wingLowerAngle;
      return;
    } else {
      g_pokeAnimationActive = false;
      if (!g_wingUpperAnimation)
        g_wingUpperAngle = document.getElementById("wingUpperSlide").value;
      if (!g_wingLowerAnimation)
        g_wingLowerAngle = document.getElementById("wingLowerSlide").value;
    }
  }

  if (g_headAnimation) {
    g_headAngle = 10 * Math.sin(g_seconds * Math.PI);
  } else {
    if (!g_pokeAnimationActive) g_headAngle = 0;
  }

  if (g_wingUpperAnimation) {
    g_wingUpperAngle = 45 * Math.sin(g_seconds * 2 * Math.PI);
    document.getElementById("wingUpperSlide").value = g_wingUpperAngle;
  }

  if (g_wingLowerAnimation) {
    g_wingLowerAngle = 35 * Math.sin(g_seconds * 2 * Math.PI + Math.PI / 3);
    document.getElementById("wingLowerSlide").value = g_wingLowerAngle;
  }

  if (g_wingHandAnimation) {
    g_wingHandAngle = 25 * Math.sin(g_seconds * 3 * Math.PI);
    document.getElementById("wingHandSlide").value = g_wingHandAngle;
  }
}

function keydown(ev) {
  if (ev.keyCode == 68) {
    // D
    g_eye[0] += 0.2;
  } else if (ev.keyCode == 65) {
    // A
    g_eye[0] -= 0.2;
  } else if (ev.keyCode == 87) {
    // W
    g_eye[2] -= 0.2;
  } else if (ev.keyCode == 83) {
    // S
    g_eye[2] += 0.2;
  } else if (ev.keyCode == 81) {
    // Q
    g_globalAngle += 10;
  } else if (ev.keyCode == 69) {
    // E
    g_globalAngle -= 10;
  }
}

function renderAllShapes() {
  var startTime = performance.now();

  var projMat = new Matrix4();
  projMat.setPerspective(60, canvas.width / canvas.height, 0.1, 200);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, projMat.elements);

  var viewMat = new Matrix4();
  viewMat.setLookAt(
    g_eye[0],
    g_eye[1],
    g_eye[2],
    g_at[0],
    g_at[1],
    g_at[2],
    g_up[0],
    g_up[1],
    g_up[2]
  );
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMat.elements);

  var globalRotMat = new Matrix4()
    .rotate(g_globalAngle, 0, 1, 0)
    .rotate(g_globalAngleX, 1, 0, 0);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.depthMask(false);
  var sky = new Cube();
  if (g_skyTextureObject) {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, g_skyTextureObject);
  }
  sky.textureNum = 0;
  sky.matrix.scale(100, 100, 100);
  sky.matrix.translate(-0.5, -0.5, -0.5);
  sky.render();
  gl.depthMask(true);

  var floor = new Cube();
  if (g_grassTextureObject) {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, g_grassTextureObject);
  }
  floor.textureNum = 0;
  floor.matrix.translate(0, -0.75, 0);
  floor.matrix.scale(20, 0.1, 20);
  floor.matrix.translate(-0.5, 0, -0.5);
  floor.render();

  var bodyColor = [1.0, 0.85, 0.0, 1.0];
  var headColor = [1.0, 0.9, 0.1, 1.0];
  var wingColor = [0.9, 0.8, 0.0, 1.0];
  var handColor = [0.85, 0.75, 0.0, 1.0];
  var beakColor = [1.0, 0.6, 0.0, 1.0];
  var legColor = [1.0, 0.6, 0.0, 1.0];
  var eyeColor = [0.1, 0.1, 0.1, 1.0];

  var body = new Cube();
  body.color = bodyColor;
  body.textureNum = -2;
  body.matrix.setTranslate(-0.4, -0.1, -0.25);
  body.matrix.scale(0.6, 0.4, 0.5);
  body.render();

  var head = new Cube();
  head.color = headColor;
  head.textureNum = -2;
  head.matrix.setTranslate(0.3, 0.3, 0);
  head.matrix.rotate(g_headAngle, 0, 0, 1);
  var headBaseMatrix = new Matrix4(head.matrix);
  head.matrix.scale(0.3, 0.3, 0.3);
  head.matrix.translate(-0.5, -0.5, -0.5);
  head.render();

  var eyeL = new Sphere();
  eyeL.color = eyeColor;
  if (typeof eyeL.textureNum !== "undefined") {
    eyeL.textureNum = -2;
  }
  eyeL.segments = 8;
  eyeL.bands = 6;
  eyeL.matrix = new Matrix4(headBaseMatrix);
  eyeL.matrix.translate(0.151, 0.1, 0.1);
  eyeL.matrix.scale(0.06, 0.06, 0.06);
  eyeL.render();

  var eyeR = new Sphere();
  eyeR.color = eyeColor;
  if (typeof eyeR.textureNum !== "undefined") {
    eyeR.textureNum = -2;
  }
  eyeR.segments = 8;
  eyeR.bands = 6;
  eyeR.matrix = new Matrix4(headBaseMatrix);
  eyeR.matrix.translate(0.151, 0.1, -0.1);
  eyeR.matrix.scale(0.06, 0.06, 0.06);
  eyeR.render();

  var beak = new Cube();
  beak.color = beakColor;
  beak.textureNum = -2;
  beak.matrix = new Matrix4(headBaseMatrix);
  beak.matrix.translate(0.16, 0, 0);
  beak.matrix.scale(0.2, 0.075, 0.26);
  beak.matrix.translate(-0.5, -0.5, -0.5);
  beak.render();

  var wingUpperL = new Cube();
  wingUpperL.color = wingColor;
  wingUpperL.textureNum = -2;
  wingUpperL.matrix.setTranslate(-0.11, 0.1, 0.29);
  wingUpperL.matrix.rotate(g_wingUpperAngle, 1, 0, 0);
  var wingUpperLMatrix = new Matrix4(wingUpperL.matrix);
  wingUpperL.matrix.scale(0.3, 0.08, 0.08);
  wingUpperL.matrix.translate(0.0, -0.5, -0.5);
  wingUpperL.render();

  var wingLowerL = new Cube();
  wingLowerL.color = wingColor;
  wingLowerL.textureNum = -2;
  wingLowerL.matrix = wingUpperLMatrix;
  wingLowerL.matrix.translate(0.3, 0, 0);
  wingLowerL.matrix.rotate(g_wingLowerAngle, 0, 0, 1);
  var wingLowerLMatrix = new Matrix4(wingLowerL.matrix);
  wingLowerL.matrix.scale(0.25, 0.07, 0.07);
  wingLowerL.matrix.translate(0.0, -0.5, -0.5);
  wingLowerL.render();

  var wingHandL = new Cube();
  wingHandL.color = handColor;
  wingHandL.textureNum = -2;
  wingHandL.matrix = wingLowerLMatrix;
  wingHandL.matrix.translate(0.25, 0, 0);
  wingHandL.matrix.rotate(g_wingHandAngle, 0, 1, 0);
  wingHandL.matrix.scale(0.1, 0.06, 0.06);
  wingHandL.matrix.translate(0.0, -0.5, -0.5);
  wingHandL.render();

  var wingUpperR = new Cube();
  wingUpperR.color = wingColor;
  wingUpperR.textureNum = -2;
  wingUpperR.matrix.setTranslate(-0.11, 0.1, -0.29);
  wingUpperR.matrix.rotate(-g_wingUpperAngle, 1, 0, 0);
  var wingUpperRMatrix = new Matrix4(wingUpperR.matrix);
  wingUpperR.matrix.scale(0.3, 0.08, 0.08);
  wingUpperR.matrix.translate(0.0, -0.5, -0.5);
  wingUpperR.render();

  var wingLowerR = new Cube();
  wingLowerR.color = wingColor;
  wingLowerR.textureNum = -2;
  wingLowerR.matrix = wingUpperRMatrix;
  wingLowerR.matrix.translate(0.3, 0, 0);
  wingLowerR.matrix.rotate(-g_wingLowerAngle, 0, 0, 1);
  var wingLowerRMatrix = new Matrix4(wingLowerR.matrix);
  wingLowerR.matrix.scale(0.25, 0.07, 0.07);
  wingLowerR.matrix.translate(0.0, -0.5, -0.5);
  wingLowerR.render();

  var wingHandR = new Cube();
  wingHandR.color = handColor;
  wingHandR.textureNum = -2;
  wingHandR.matrix = wingLowerRMatrix;
  wingHandR.matrix.translate(0.25, 0, 0);
  wingHandR.matrix.rotate(-g_wingHandAngle, 0, 1, 0);
  wingHandR.matrix.scale(0.1, 0.06, 0.06);
  wingHandR.matrix.translate(0.0, -0.5, -0.5);
  wingHandR.render();

  const upperLegHeight = 0.2;
  const lowerLegHeight = 0.15;
  var legUpL = new Cube();
  legUpL.color = legColor;
  legUpL.textureNum = -2;
  legUpL.matrix.setTranslate(-0.15, -0.1, 0.15);
  var legUpLMatrix = new Matrix4(legUpL.matrix);
  legUpL.matrix.scale(0.08, upperLegHeight, 0.08);
  legUpL.matrix.translate(-0.5, -1.0, -0.5);
  legUpL.render();

  var legLowL = new Cube();
  legLowL.color = legColor;
  legLowL.textureNum = -2;
  legLowL.matrix = legUpLMatrix;
  legLowL.matrix.translate(0, -upperLegHeight, 0);
  var legLowLMatrix = new Matrix4(legLowL.matrix);
  legLowL.matrix.scale(0.07, lowerLegHeight, 0.07);
  legLowL.matrix.translate(-0.5, -1.0, -0.5);
  legLowL.render();

  var footL = new Cube();
  footL.color = legColor;
  footL.textureNum = -2;
  footL.matrix = legLowLMatrix;
  footL.matrix.translate(0, -lowerLegHeight, 0.04);
  footL.matrix.scale(0.18, 0.04, 0.15);
  footL.matrix.translate(-0.5, -0.5, -0.75);
  footL.render();

  var legUpR = new Cube();
  legUpR.color = legColor;
  legUpR.textureNum = -2;
  legUpR.matrix.setTranslate(-0.15, -0.1, -0.15);
  var legUpRMatrix = new Matrix4(legUpR.matrix);
  legUpR.matrix.scale(0.08, upperLegHeight, 0.08);
  legUpR.matrix.translate(-0.5, -1.0, -0.5);
  legUpR.render();

  var legLowR = new Cube();
  legLowR.color = legColor;
  legLowR.textureNum = -2;
  legLowR.matrix = legUpRMatrix;
  legLowR.matrix.translate(0, -upperLegHeight, 0);
  var legLowRMatrix = new Matrix4(legLowR.matrix);
  legLowR.matrix.scale(0.07, lowerLegHeight, 0.07);
  legLowR.matrix.translate(-0.5, -1.0, -0.5);
  legLowR.render();

  var footR = new Cube();
  footR.color = legColor;
  footR.textureNum = -2;
  footR.matrix = legLowRMatrix;
  footR.matrix.translate(0, -lowerLegHeight, 0.04);
  footR.matrix.scale(0.18, 0.04, 0.15);
  footR.matrix.translate(-0.5, -0.5, -0.75);
  footR.render();

  var duration = performance.now() - startTime;
  sendTextToHTML(
    " ms: " +
      Math.floor(duration) +
      " fps: " +
      Math.floor(10000 / duration) / 10,
    "numdot"
  );
}

function sendTextToHTML(text, htmlID) {
  var htmlElm = document.getElementById(htmlID);
  if (!htmlElm) {
    console.log("Failed to get : " + htmlID + " from HTML");
    return;
  }
  htmlElm.innerHTML = text;
}
