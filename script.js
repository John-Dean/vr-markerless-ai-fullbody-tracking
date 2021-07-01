let RUNNING	=	false;

let is_primary	=	true;
let server_url	=	undefined;

(function(){
	let params	=	((location.search+" ").substring(1)).trim().split("&");
	
	params	=	params.map(param => param.split("="));
	
	for(let i=0;i<params.length;i++){
		let key		=	params[i][0];
		let value	=	params[i][1];
		
		
		if(key == "ws"){
			is_primary	=	false;
			server_url	=	value;
		}
	}
	
	if(is_primary){
		load_visualization();	
	}
	
	document.body.setAttribute("data-primary",is_primary);
})();



document.querySelector(".button").onclick	=	function(){
	RUNNING	=	!RUNNING;
	if(RUNNING){
		this.innerHTML	=	"Stop";	
	}else{
		this.innerHTML	=	"Start";
	}
}


const process_pose	=	(function(){
	let websocket;
	let connected	=	false;
	
	const setup_websocket	=	async function(ws_url = undefined){
		let qr_code_url;
		if(ws_url == undefined){
			[ws_url, qr_code_url]	=	await find_local_url();
		}
		
		let websocket	=	await connect_to_websocket(ws_url);
	
		if(qr_code_url != undefined){
			new QRCode(document.querySelector(".qr-code"), qr_code_url);
		}
		
		websocket.onmessage	=	function(message){
			if(typeof websocket.data_callback !== 'function'){
				return;
			}
		
			let json	=	JSON.parse(message.data);
			let vr_trackers	=	json.vr_trackers;
		
			let current_positions	=	vr_trackers.map(tracker => new VRObject(tracker));
		
			websocket.data_callback(current_positions);
		}
		
		return websocket;
	}
	
	const	ping_pong	=	function(){
		return new Promise(
			function(resolve, reject){
				websocket.data_callback	=	resolve;
				websocket.send("");
				
				
				setTimeout(function(){
					reject();
				}, 1000)
			}
		);
	}
	
	return async function(best_pose){
		if(!connected){
			websocket	=	await setup_websocket(server_url);
			connected	=	true;
			update_connected_status(connected);
		}
		
		let latest_devices	=	await ping_pong();
		
		let [HMD, left_controller, right_controller] = find_hmd_controllers(latest_devices);
		
		
		
		const openvr_tracked_pose	=	new Pose3D();
		copy_position(HMD, openvr_tracked_pose.hmd, 1);
		copy_position(left_controller, openvr_tracked_pose.left_controller, 1);
		copy_position(right_controller, openvr_tracked_pose.right_controller, 1);
		
		copy_position(best_pose.nose, best_pose.hmd, 1);
		copy_position(best_pose.left_index, best_pose.left_controller, 1);
		copy_position(best_pose.right_index, best_pose.right_controller, 1);
		
		const openvr_mapped_pose	=	align_poses(best_pose, openvr_tracked_pose, false);
		
		
		const output	=	[];
		
		
		point_to_websocket("left_elbow", openvr_mapped_pose, output);
		point_to_websocket("right_elbow", openvr_mapped_pose, output);
		point_to_websocket("left_hip", openvr_mapped_pose, output);
		point_to_websocket("right_hip", openvr_mapped_pose, output);
		point_to_websocket("left_heel", openvr_mapped_pose, output);
		point_to_websocket("right_heel", openvr_mapped_pose, output);
		
		websocket.send(JSON.stringify(output));
		try{
			openvr_visualiser.display_pose(openvr_mapped_pose);
		}catch(error){}
		
	}
})();





const video_element = document.createElement("video");
const canvas_element = document.createElement("canvas");
document.querySelector("section .video-feed").appendChild(video_element);
document.querySelector("section .video-feed").appendChild(canvas_element);

update_status("Initializing - Creating camera");



const pose_network = new PoseNetwork();

const neural_net_results	=	(function(){
	const	queued_process_pose	=	new QueueFunction(process_pose);
	
	return function(results){
		if(!results.poseWorldLandmarks){
			return;
		}
	
		try{
			annotate_camera(canvas_element, results);
		}catch(error){};
		
		update_status("Running");
	
		const pose	=	new Pose3D(results.poseWorldLandmarks);
		
		try{
			pose_visualiser.display_pose(pose);
		}catch(error){}
		
		queued_process_pose.run(pose);
	}
})();

const	new_frame	=	async function(){
	if(RUNNING){
		await pose_network.send({ image: video_element });	
	}
}

pose_network.onResults	=	neural_net_results;

const camera = new Camera(video_element, {
	onFrame: async() => {
		await new_frame();
	},
	width: 1280,
	height: 720
});

update_status("Ready, waiting start");

camera.start();
