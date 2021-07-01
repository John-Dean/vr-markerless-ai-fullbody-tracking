
class VRObject{
	constructor(object_data){
		this.data	=	object_data || new Array();
		
		// https://chromium.googlesource.com/experimental/chromium/src/+/refs/wip/bajones/webvr/third_party/openvr/openvr/headers/openvr.h
		const device_class_enumeration	=	[
			"Invalid",
			"HMD",
			"Controller",
			"TrackingReference"
		];
		
		const controller_role_enumeration	=	[
			"Invalid",
			"Left",
			"Right"
		];
		
		this.device_class	=	device_class_enumeration[this.data.class] || "Other";
		this.controller_role	=	controller_role_enumeration[this.data.role] || "Other";
		
		this.x	=	this.data.x;
		this.y	=	this.data.y;
		this.z	=	this.data.z;
		this.qw	=	this.data.qw;
		this.qx	=	this.data.qx;
		this.qy	=	this.data.qy;
		this.qz	=	this.data.qz;
	}
}

class Pose3D{
	constructor(pose_data){
		this.timestamp	=	new Date().getTime();
		
		const	enumeration	=	[
			"nose",
			"left_eye_inner",
			"left_eye",
			"left_eye_outer",
			"right_eye_inner",
			"right_eye",
			"right_eye_outer",
			"left_ear",
			"right_ear",
			"mouth_left",
			"mouth_right",
			"left_shoulder",
			"right_shoulder",
			"left_elbow",
			"right_elbow",
			"left_wrist",
			"right_wrist",
			"left_pinky",
			"right_pinky",
			"left_index",
			"right_index",
			"left_thumb",
			"right_thumb",
			"left_hip",
			"right_hip",
			"left_knee",
			"right_knee",
			"left_ankle",
			"right_ankle",
			"left_heel",
			"right_heel",
			"left_foot_index",
			"right_foot_index",
			"hmd",
			"left_controller",
			"right_controller"
		]
		
		this.landmarks	=	new Array(enumeration.length);
		const landmarks	=	this.landmarks;
		
		for(let i = 0; i < landmarks.length; i++){
			landmarks[i]	=		(pose_data || [])[i] || {};
		}
		
		
		const pose	=	this;
		
		for(let i = 0; i < enumeration.length; i++){
			const landmark_name	=	enumeration[i];
			
			Object.defineProperty(pose, landmark_name, {
				enumerable: false,
				configurable: false,
				set: function(value){
					landmarks[i]	=	value;
				},
				get: function(){
					return landmarks[i];
				}
			});
		}
	}
}

const running_element = document.querySelector("section .running");
const connected_element = document.querySelector("section .connected");


class WebsocketConnection{
	constructor(websocket_address){
		const This	=	this;
		this.websocket	=	new WebSocket(websocket_address);
		const websocket	=	this.websocket;
		
		This.onopen	=	function(){}
		This.onclose	=	function(){}
		This.onmessage	=	function(){}
		This.onerror	=	function(){}
		
   		websocket.onopen = function(){
			This.onopen.call(This, ...arguments);
		};
   		websocket.onclose = function(){
			This.onclose.call(This, ...arguments);
		};
   		websocket.onmessage = function(){
			This.onmessage.call(This, ...arguments);
		};
   		websocket.onerror = function(){
			This.onerror.call(This, ...arguments);
		};
		
		this.send	=	function(){
			websocket.send(...arguments);
		};
	}
}

let ws_url	=	"ws://127.0.0.1:8082";
let connected	=	false;
let latest_pose;

connected_element.innerHTML	=	connected;

const send_pose	=	(function(){
	let websocket;
	let current_positions	=	[];
	let data_callback;
	return async function(best_pose){
		if(!connected){
			console.log("Trying to connect");
			websocket	=	await new Promise(
				async function(resolve, reject){
					setTimeout(function(){
						reject();
					}, 10000)
					
					// let ws_url_test	=	await findLocalIp();
					// for(let i=0;i<ws_url_test.length;i++){
					// 	if(/^\d+(\.\d+)*$/.test(ws_url_test[i])){
					// 		ws_url	=	"ws://" + ws_url_test[i] + ":8082";
					// 		break;
					// 	}
					// }					
					
					
					const websocket = new WebsocketConnection(ws_url);
					websocket.onopen	=	function(){
						resolve(websocket);
					}
					
				}
			)
			websocket.onmessage	=	function(message){
				let raw_json	=	message.data.replaceAll('nan(ind)', '0');
				let json	=	JSON.parse(raw_json);
				let vr_trackers	=	json.vr_trackers;
				let output	=	[];
				for(let i = 0; i < vr_trackers.length; i++){
					output[i]	=	new VRObject(vr_trackers[i]);
				}
				
				current_positions	=	output;
				// console.log(current_positions);
				try{
					data_callback(current_positions);
				} catch(error){};
			}
			connected	=	true;
			connected_element.innerHTML	=	connected;
		}
		
		let latest_devices	=	await new Promise(
			function(resolve, reject){
				data_callback	=	resolve;
				websocket.send("");
				
				
				setTimeout(function(){
					reject();
				}, 1000)
			}
		);
		
		let HMD, left_controller, right_controller;
		
		for(let device of latest_devices){
			if(device.device_class == "HMD"){
				HMD	=	device;
			}
			if(device.device_class == "Controller" && device.controller_role == "Left"){
				left_controller	=	device;
			}
			if(device.device_class == "Controller" && device.controller_role == "Right"){
				right_controller	=	device;
			}
		}
		
		
		const openvr_pose	=	new Pose3D();
		openvr_pose.hmd.x					=	(HMD || {}).x || 0
		openvr_pose.hmd.y					=	(HMD || {}).y || 0
		openvr_pose.hmd.z					=	(HMD || {}).z || 0
		openvr_pose.hmd.visibility			=	1;
		
		
		openvr_pose.left_controller.x					=	(left_controller || {}).x || 0
		openvr_pose.left_controller.y					=	(left_controller || {}).y || 0
		openvr_pose.left_controller.z					=	(left_controller || {}).z || 0
		openvr_pose.left_controller.visibility			=	1;
		
		
		openvr_pose.right_controller.x					=	(right_controller || {}).x || 0
		openvr_pose.right_controller.y					=	(right_controller || {}).y || 0
		openvr_pose.right_controller.z					=	(right_controller || {}).z || 0
		openvr_pose.right_controller.visibility			=	1;
		
		best_pose.hmd				=	best_pose.nose; // mid_point(best_pose.left_eye, best_pose.right_eye);
		best_pose.left_controller	=	best_pose.left_index // best_point(best_pose.left_index, best_pose.left_wrist);
		best_pose.right_controller	=	best_pose.right_index // best_point(best_pose.right_index, best_pose.right_wrist);
		
		best_pose.hmd.visibility				=	1;
		best_pose.left_controller.visibility	=	1;
		best_pose.right_controller.visibility	=	1;
		
		const new_pose	=	align_poses(best_pose, openvr_pose, false);
		
		
		const output	=	[];
		function stream_point(name){
			output.push({
				id:	name,
				x:	new_pose[name].x,
				y:	new_pose[name].y,
				z:	new_pose[name].z
			})
		}
		
		
		stream_point("left_elbow");
		stream_point("right_elbow");
		stream_point("left_hip");
		stream_point("right_hip");
		stream_point("left_heel");
		stream_point("right_heel");
		// stream_point("left_shoulder");
		// stream_point("left_wrist");
		// stream_point("right_wrist");
		// stream_point("nose");
		
		websocket.send(JSON.stringify(output));
		
		
		display_pose(best_pose, grid);
		display_pose(new_pose, grid_1);
	}
})();

const mid_point	=	function(position_1, position_2){
	return{
		x: (position_1.x + position_2.x) / 2,
		y: (position_1.y + position_2.y) / 2,
		z: (position_1.z + position_2.z) / 2
	}
}

const best_point	=	function(position_1, position_2){
	if(position_1.visibility > position_2.visibility){
		return position_1;
	}
	return position_2;
}

const display_pose	=	function(pose, output_grid = grid){
	output_grid.updateLandmarks(pose.landmarks.slice(0,-3), POSE_CONNECTIONS, [])
}

const	align_poses	=	function(pose_1, pose_2, use_only_three_points = false, minimum_visibility = 0.5){
	let points_1	=	pose_1.landmarks;
	let points_2	=	pose_2.landmarks;
	
	let merged_array	=	[];
	for(let i = 0; i < Math.min(points_1.length, points_2.length); i++){
		let point1	=	points_1[i] || {};
		let point2	=	points_2[i] || {};
		
		const merged_points	=	{
			x1:	point1.x || 0,
			y1:	point1.y || 0,
			z1:	point1.z || 0,
			
			x2:	point2.x || 0,
			y2:	point2.y || 0,
			z2:	point2.z || 0,
			
			visibility:	Math.min((point1.visibility || 0), (point2.visibility || 0)),
			index: i
		}
		
		merged_array.push(merged_points);
	}
	
	
	merged_array	=	merged_array.sort(function(a, b){
		return b.visibility - a.visibility;
	})
	
	let output_array_1		=	[[], [], []];
	let output_array_2		=	[[], [], []];
	let output_array_all	=	[[], [], []];
	
	let total_points	=	0;
	for(let i = 0; i < merged_array.length; i++){
		const merged_point	=	merged_array[i];
		
		if(total_points < 3 || ((merged_point.visibility > minimum_visibility) && (!use_only_three_points))){
			output_array_1[0].push(merged_point.x1)
			output_array_1[1].push(merged_point.y1)
			output_array_1[2].push(merged_point.z1)
			
			output_array_2[0].push(merged_point.x2)
			output_array_2[1].push(merged_point.y2)
			output_array_2[2].push(merged_point.z2)
			
			total_points++;
		}
		
		let point1	=	points_1[i] || {};
		output_array_all[0].push(point1.x || 0)
		output_array_all[1].push(point1.y || 0)
		output_array_all[2].push(point1.z || 0)
	}
	
	// console.log(merged_array);
	// console.log(output_array_1, output_array_all, points_1);
	// debugger;
	
	
	
	let matrix_1	=	new mlMatrix.Matrix(output_array_1);
	let matrix_2	=	new mlMatrix.Matrix(output_array_2);
	let matrix_all	=	new mlMatrix.Matrix(output_array_all);
	
	let reprojected	=	getSimilarityTransformation(matrix_1, matrix_2, matrix_all, false);
	// console.log(matrix_1, matrix_2);
	// console.log(reprojected);
	
	const output_pose	=	 new Pose3D();
	
	for(let i = 0; i < merged_array.length; i++){
		output_pose.landmarks[i].x	=	reprojected.data[0][i];
		output_pose.landmarks[i].y	=	reprojected.data[1][i];
		output_pose.landmarks[i].z	=	reprojected.data[2][i];
		output_pose.landmarks[i].visibility	=	points_1[i].visibility || 0;
	}
	
	return output_pose;
}

const	try_send_pose	=	(function(){
	let is_sending = false;
	
	return async function(){
		if(!is_sending){
			is_sending	=	true;
			
			let cached_pose_timestamp	=	latest_pose.timestamp;
			try{
				await send_pose(latest_pose);
				is_sending	=	false;
			} catch(error){
				console.error(error);
			}
			
			
			if(cached_pose_timestamp != latest_pose.timestamp){
				try_send_pose();
			}
		}
	}
})();


const neural_net_results	=	function(results){
	if(!results.poseWorldLandmarks){
		return;
	}
	
	let context	=	canvas_element.getContext('2d');
	canvas_element.width	=	video_element.videoWidth;
	canvas_element.height	=	video_element.videoHeight;
	context.clearRect(0, 0, canvas_element.width, canvas_element.height);
	
	// console.log(results);
	// debugger;
	
	// for(let i=0;i<results.poseLandmarks.length;i++){
	// 	let landmark	=	results.poseLandmarks[i];
	// 	let x	=	landmark.x - 3;
	// 	let y	=	landmark.y - 3;
		
	// 	console.log(x,y);
		
	// 	context.rect(x, y, 6, 6);
	// 	context.fill();
	// }
	
	drawConnectors(context, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 4 });
	drawLandmarks(context, results.poseLandmarks, { color: '#FF0000', lineWidth: 2 });
	
	running_element.innerHTML	=	"Running";
	
	const pose	=	new Pose3D(results.poseWorldLandmarks);
	
	latest_pose	=	pose;
	try_send_pose();
}

const pose_network = new Pose({
	locateFile: (file) => {
		running_element.innerHTML	=	"Initializing - Loading file " + file;
		console.log('Loading file: ' + file);
		return`https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
	}
});

const findLocalIp = (logInfo = true) => new Promise( (resolve, reject) => {
    window.RTCPeerConnection = window.RTCPeerConnection 
                            || window.mozRTCPeerConnection 
                            || window.webkitRTCPeerConnection;

    if ( typeof window.RTCPeerConnection == 'undefined' )
        return reject('WebRTC not supported by browser');

    let pc = new RTCPeerConnection();
    let ips = [];

    pc.createDataChannel("");
    pc.createOffer()
     .then(offer => pc.setLocalDescription(offer))
     .catch(err => reject(err));
    pc.onicecandidate = event => {
        if ( !event || !event.candidate ) {
            // All ICE candidates have been sent.
            if ( ips.length == 0 )
                return reject('WebRTC disabled or restricted by browser');

            return resolve(ips);
        }

        let parts = event.candidate.candidate.split(' ');
        let [base,componentId,protocol,priority,ip,port,,type,...attr] = parts;
        let component = ['rtp', 'rtpc'];

        if ( ! ips.some(e => e == ip) )
            ips.push(ip);

        if ( ! logInfo )
            return;

        console.log(" candidate: " + base.split(':')[1]);
        console.log(" component: " + component[componentId - 1]);
        console.log("  protocol: " + protocol);
        console.log("  priority: " + priority);
        console.log("        ip: " + ip);
        console.log("      port: " + port);
        console.log("      type: " + type);

        if ( attr.length ) {
            console.log("attributes: ");
            for(let i = 0; i < attr.length; i += 2)
                console.log("> " + attr[i] + ": " + attr[i+1]);
        }

        console.log();
    };
} );




const landmarkContainer = document.querySelectorAll('.landmark-grid-container')[0];
const grid = new LandmarkGrid(landmarkContainer, {
	connectionColor: 0xCCCCCC,
	definedColors:
      [{ name: 'LEFT', value: 0xffa500 }, { name: 'RIGHT', value: 0x00ffff }],
	fitToGrid: true,
	labeledLength: 2,
	labelSuffix: 'm',
	numCellsPerAxis: 4,
	showHidden: false
});


const landmarkContainer_1 = document.querySelectorAll('.landmark-grid-container')[1];
const grid_1 = new LandmarkGrid(landmarkContainer_1, {
	connectionColor: 0xCCCCCC,
	definedColors:
      [{ name: 'LEFT', value: 0xffa500 }, { name: 'RIGHT', value: 0x00ffff }],
	fitToGrid: true,
	labeledLength: 2,
	labelSuffix: 'm',
	numCellsPerAxis: 4,
	showHidden: false
});

pose_network.setOptions({
	modelComplexity: 1,
	smoothLandmarks: true,
	minDetectionConfidence: 0.5,
	minTrackingConfidence: 0.5
});
pose_network.onResults(neural_net_results);

const video_element = document.createElement("video");
const canvas_element = document.createElement("canvas");
document.querySelector("section .video-feed").appendChild(video_element);
document.querySelector("section .video-feed").appendChild(canvas_element);

running_element.innerHTML	=	"Initializing - Creating camera";

const camera = new Camera(video_element, {
	onFrame: async() => {
		await pose_network.send({ image: video_element });
	},
	width: 1280,
	height: 720
});
running_element.innerHTML	=	"Initializing - Starting camera";
camera.start();
