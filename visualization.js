class Visualiser3D{
	constructor(element){
		const landmarkContainer = element;
		const grid = new LandmarkGrid(landmarkContainer, {
			connectionColor: 0xCCCCCC,
			definedColors: [],
			fitToGrid: true,
			labeledLength: 2,
			labelSuffix: 'm',
			numCellsPerAxis: 4,
			showHidden: false
		});
		
		this.grid	=	grid;
		this.landmarkContainer	=	landmarkContainer;
		
		this.display_pose	=	function(pose){
			grid.updateLandmarks(pose.landmarks.slice(0, -3), POSE_CONNECTIONS, [])
		}
	}
}

const	annotate_camera	=	function(canvas, results){
	let context	=	canvas.getContext('2d');
	canvas_element.width	=	video_element.videoWidth;
	canvas_element.height	=	video_element.videoHeight;
	context.clearRect(0, 0, canvas.width, canvas.height);
	
	drawConnectors(context, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 4 });
	drawLandmarks(context, results.poseLandmarks, { color: '#FF0000', lineWidth: 2 });
}



let pose_visualiser	=	new Visualiser3D(document.querySelectorAll('.landmark-grid-container')[0]);
let openvr_visualiser	=	new Visualiser3D(document.querySelectorAll('.landmark-grid-container')[1]);
