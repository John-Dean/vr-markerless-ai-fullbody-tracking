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

class PoseNetwork{
	constructor(){
		const This = this;
		
		this.network	=		new Pose({
			locateFile: (file) => {
				console.log('Loading file: ' + file);
				try{
					update_status('Loading file: \n' + file);
				} catch(error){}
				return`https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
			}
		});
		
		const network	=	this.network;
		
		this.onResults	=	function(){}
		
		network.setOptions({
			modelComplexity: 1,
			smoothLandmarks: true,
			minDetectionConfidence: 0.5,
			minTrackingConfidence: 0.5
		});
		
		network.onResults(function(){
			This.onResults.call(this, ...arguments);
		});
		
		this.send	=	function(){
			return network.send(...arguments);
		}
	}
}


class QueueFunction{
	constructor(queued_function){
		const This = this;
		
		this.function	=	queued_function;
		
		let is_running	=	false;
		let is_pending	=	false;
		
		let last_args;
		
		const try_run	=	async function(){
			if(is_running == true){
				is_pending	=	true;
				return;
			}else{
				is_running	=	true;
				try{
					await This.function(...last_args);
					is_running	=	false;
				}catch(error){
					console.error(error);
				}
				
				if(is_pending){
					requestAnimationFrame(try_run);
				}				
			}
		}
		
		this.run	=	function(){
			last_args	=	arguments;
			
			try_run();
		}
		
	}	
}
