
var ipAdd=ipAddress();
var port=portNo();


//alert(ipAdd);



$("#submitInitalRequest").click(function(){
	
	
	var claimId=$("#MclaimId").val();
	 var policyId=$("#MpolicyId").val();
	
	

	 setTimeout(function(){ 
		 
		 

$.ajax({
	
    dataType:"json",
    contentType: 'application/json; charset=UTF-8',
	//url: "http://"+ipAdd+":"+port+"/acceptClaim?claimId="+claimId+"&policyId="+policyId,
	url: "/acceptClaim?claimId="+claimId+"&policyId="+policyId,
	type:"POST",
    global:false,
    async:false, 
    success: function(result){
	//alert(result);
    	 document.getElementById("txId").innerHTML = result.txId;
        
    	var modal = document.getElementById('myModal');

    	

    	// Get the <span> element that closes the modal
    	var span = document.getElementsByClassName("close")[0];

    	
    	    modal.style.display = "block";


    	// When the user clicks on <span> (x), close the modal
    	span.onclick = function() {
    	    modal.style.display = "none";
    	}

    	// When the user clicks anywhere outside of the modal, close it
    	window.onclick = function(event) {
    	    if (event.target == modal) {
    	        modal.style.display = "none";
    	    }
    	}
	
       
        
        setTimeout(function(){ 
            
           window.location.href="allClaims.html";
        }, 2000);
        // ViewTokenForBaggage.html?baggageId=5615192
 	}
 });
 	 }, 1000);
 	 
 	 

 });
