const findLocalIp = (logInfo = false) => new Promise((resolve, reject) => {
	window.RTCPeerConnection = window.RTCPeerConnection ||
							window.mozRTCPeerConnection ||
							window.webkitRTCPeerConnection;

	if(typeof window.RTCPeerConnection === 'undefined'){ return reject('WebRTC not supported by browser'); }

	let pc = new RTCPeerConnection();
	let ips = [];

	pc.createDataChannel("");
	pc.createOffer()
	.then(offer => pc.setLocalDescription(offer))
	.catch(err => reject(err));
	pc.onicecandidate = event => {
		if(!event || !event.candidate){
			// All ICE candidates have been sent.
			if(ips.length == 0){ return reject('WebRTC disabled or restricted by browser'); }

			return resolve(ips);
		}

		let parts = event.candidate.candidate.split(' ');
		let[base, componentId, protocol, priority, ip, port,, type, ...attr] = parts;
		let component = ['rtp', 'rtpc'];

		if(!ips.some(e => e == ip)){ ips.push(ip); }

		if(!logInfo){ return; }

		console.log(" candidate: " + base.split(':')[1]);
		console.log(" component: " + component[componentId - 1]);
		console.log("  protocol: " + protocol);
		console.log("  priority: " + priority);
		console.log("        ip: " + ip);
		console.log("      port: " + port);
		console.log("      type: " + type);

		if(attr.length){
			console.log("attributes: ");
			for(let i = 0; i < attr.length; i += 2){ console.log("> " + attr[i] + ": " + attr[i + 1]); }
		}

		console.log();
	};
});

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
	
	
	
	let matrix_1	=	new mlMatrix.Matrix(output_array_1);
	let matrix_2	=	new mlMatrix.Matrix(output_array_2);
	let matrix_all	=	new mlMatrix.Matrix(output_array_all);
	
	let reprojected	=	getSimilarityTransformation(matrix_1, matrix_2, matrix_all, false);
	
	const output_pose	=	 new Pose3D();
	
	for(let i = 0; i < merged_array.length; i++){
		output_pose.landmarks[i].x	=	reprojected.data[0][i];
		output_pose.landmarks[i].y	=	reprojected.data[1][i];
		output_pose.landmarks[i].z	=	reprojected.data[2][i];
		output_pose.landmarks[i].visibility	=	points_1[i].visibility || 0;
	}
	
	return output_pose;
}

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

const find_local_url = async function(){
	let ws_url_test	=	await findLocalIp();
	for(let i = 0; i < ws_url_test.length; i++){
		if(/^\d+(\.\d+)*$/.test(ws_url_test[i])){
			ws_url	=	"ws://" + ws_url_test[i] + ":8082";
							
							
			let host_url	=	location.href;
			host_url	=	host_url.replace('http://localhost', 'http://' + ws_url_test[i]);
			host_url	=	host_url.replace('https://localhost', 'https://' + ws_url_test[i]);
							
			host_url += "?ws=" + ws_url;
							
							
			return [ws_url, host_url]
		}
	}
	
	return [];
}

const find_hmd_controllers  =   function(devices){
	let HMD, left_controller, right_controller;
	
	for(let device of devices){
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
	
	return [HMD, left_controller, right_controller];
}

const update_position   =   function(position,x = 0,y = 0,z = 0,visibility = 0){
	if(x != undefined){
		position.x  =   x;   
	}
	if(y != undefined){
		position.y  =   y;   
	}
	if(z != undefined){
		position.z	=   z;   
	}
	if(visibility != undefined){
		position.visibility  =   visibility;   
	}
}

const copy_position	=	function(from, to, visibility_override = undefined){
	to.x	=	(from || {}).x;
	to.y	=	(from || {}).y;
	to.z	=	(from || {}).z;
	if(visibility_override != undefined){
		to.visibility	=	visibility_override;
	}else{
		to.visibility	=	(from || {}).visibility;
	}
}

const point_to_websocket	=	function(name, pose, output){
	try{
		output.push({
			id:	name,
			x:	pose[name].x,
			y:	pose[name].y,
			z:	pose[name].z
		})
	}catch(error){}
}

const	connect_to_websocket	=	function(ws_url){
	return new Promise(
		async function(resolve, reject){
			setTimeout(function(){
				reject();
			}, 10000)
			
			const websocket = new WebsocketConnection(ws_url);
			websocket.onopen	=	function(){
				resolve(websocket);
			}
		}
	)
}


const	load_visualization	=	function(){
	let script	=	document.createElement("script");
	script.src	=	"visualization.js";
	document.head.appendChild(script);
}

