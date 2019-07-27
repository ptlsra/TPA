
var ipAdd=ipAddress();
var port=portNo();


//alert(ipAdd);



$("#finalClaimSubmission").click(function(){
	
	var claimId=$('#MclaimId').val();
	
	

	//console.log("http://"+ipAdd+":"+port+"approveClaim?claimId="+claimId);
		 
		 

$.ajax({
	
    dataType:"json",
    contentType: 'application/json; charset=UTF-8',
	//url: "http://"+ipAdd+":"+port+"/approveClaim?claimId="+claimId,
	url: "/approveClaim?claimId="+claimId,
    type:"POST",
    global:false,
    async:true, 
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
 	
 	 
 	 

 });
