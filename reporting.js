
const   update_status   =   function(value){
	try{
		const element = document.querySelector("section .status");
		element.innerHTML   =   value;
	}catch(error){}   
}

const   update_connected_status   =   function(value){
	try{
		const element = document.querySelector("section .connected");
		element.innerHTML   =   value;
	}catch(error){}   
}
