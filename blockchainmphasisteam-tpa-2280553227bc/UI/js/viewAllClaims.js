  var tempLists=[];
	 var dataSets=[];
	 

       	
       	var ipAddress=ipAddress();
       	var portNo=portNo();
       	
		  // $.get("http://"+ipAddress+":"+portNo+"/getClaimListForTPA", function(response){

      	$.get("/getClaimListForTPA", function(response){
      	  // alert(JSON.stringify(response));
			$.each(response, function(i, item) {
				
		
				 var unixtimestamp = item.timestamp;
				 unixtimestamp=unixtimestamp.toString().slice(0,-9);

 				 // Months array
 				 var months_arr = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

 				 // Convert timestamp to milliseconds
 				 var date = new Date(unixtimestamp*1000);

 				 // Year
 				 var year = date.getFullYear();

 				 // Month
 				 var month = months_arr[date.getMonth()];

 				 // Day
 				 var day = date.getDate();

 				 // Hours
 				 var hours = date.getHours();

 				 // Minutes
 				 var minutes = "0" + date.getMinutes();

 				 // Seconds
 				 var seconds = "0" + date.getSeconds();

 				 // Display date time in MM-dd-yyyy h:m:s format
 				 var convdataTime = month+'-'+day+'-'+year+' '+hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);
 			
			
var customerName=item.policyHolderName;
var newcustomerName = customerName.split('_').join(' ');

var patientName=item.patientName;
var newpatientName = patientName.split('_').join(' ');


				var amount=item.claimEstimate;
				var strRepass = amount;
				/*
				var strRepass = amount.split('.');
				 if (strRepass[0].length >= 4) {
				 	strRepass[0] = strRepass[0].replace(/(\d)(?=(\d{3})+$)/g, '$1,');
				 }
				 if (strRepass[1] && strRepass[1].length >= 4) {
				 	strRepass[1] = strRepass[1].replace(/(\d{3})/g, '$1 ');
				 }
				 strRepass.join('.');
				 */
				strRepass=strRepass.toFixed().replace(/(\d)(?=(\d{3})+(,|$))/g, '$1,')

				if(item.claimStatus=="initialApprovalPending"){
					var displayStatus="Pending Approval";
					
				tempLists.push(i+1,item.claimId,newcustomerName,newpatientName,convdataTime,strRepass,displayStatus,'<a  href=ViewClaimDetails.html?claimId='+item.claimId+'&policyId='+item.policyId+'&claimEstimate='+amount+'&policyHolderName='+customerName+'&patientName='+patientName+'> View ');
				dataSets.push(tempLists);
				tempLists=[];
				
				}  
				
				if(item.claimStatus=="needInsuranceApproval"){
					var displayStatus="Need Insurance Approval";
					
				//tempLists.push(i+1,item.claimId,newcustomerName,newpatientName,convdataTime,"$"+strRepass,displayStatus,'<a  href=ViewClaimDetails.html?claimId='+item.claimId+'&policyId='+item.policyId+'&claimEstimate='+amount+'&policyHolderName='+customerName+'&patientName='+patientName+'> View ');
				tempLists.push(i+1,item.claimId,newcustomerName,newpatientName,convdataTime,strRepass,'<a  href=PendingInsApproval.html?claimId='+item.claimId+'&policyId='+item.policyId+'&claimEstimate='+amount+'&policyHolderName='+customerName+'&patientName='+patientName+'>'+displayStatus,'');

				dataSets.push(tempLists);
				tempLists=[];
				
				}  
				 
				 if(item.claimStatus=="billsPending"){
					 
					 if (item.approverName=="TPA"||item.approverName=="tpa" ){
							
						 tempLists.push(i+1,item.claimId,newcustomerName,newpatientName,convdataTime,strRepass,'<a  href=ViewClaimDetailsDone.html?claimId='+item.claimId+'&policyId='+item.policyId+'&claimEstimate='+amount+'&policyHolderName='+customerName+'&patientName='+patientName+'> Initial Approval Done','');
							dataSets.push(tempLists);
							tempLists=[];
				
						}  
					 
					 
					 
					 else if (item.approverName=="mBroker"||item.approverName=="mbroker" ){
							
						 tempLists.push(i+1,item.claimId,newcustomerName,newpatientName,convdataTime,strRepass,'<a  href=ViewClaimDetailsDone.html?claimId='+item.claimId+'&policyId='+item.policyId+'&claimEstimate='+amount+'&policyHolderName='+customerName+'&patientName='+patientName+'> Initial Approval Done by mBroker ','');
							dataSets.push(tempLists);
							tempLists=[];
					
						}  
					 
					 else{
						 tempLists.push(i+1,item.claimId,newcustomerName,newpatientName,convdataTime,strRepass,'<a  href=ViewClaimDetailsDone.html?claimId='+item.claimId+'&policyId='+item.policyId+'&claimEstimate='+amount+'&policyHolderName='+customerName+'&patientName='+patientName+'> Initial Approval Done by Insurer','');
							dataSets.push(tempLists);
							tempLists=[];
					 }
						
					
					}  
				 
				 
				 
				 
				 
				
				 
				 
				 if(item.claimStatus=="finalApprovalPending"){
					 if (item.approverName=="mBroker"||item.approverName=="mbroker" ){
						var displayStatus="FinalApproval Pending From mBroker ";
						
						tempLists.push(i+1,item.claimId,newcustomerName,newpatientName,convdataTime,strRepass,displayStatus,'<a  href=FinalApprovalPendingMarsh.html?claimId='+item.claimId+'&policyId='+item.policyId+'&claimEstimate='+amount+'&policyHolderName='+customerName+'&patientName='+patientName+'> View ');
						dataSets.push(tempLists);
						tempLists=[];
					
					}  
					 
					 else if (item.approverName=="tpa"||item.approverName=="TPA" ){
							var displayStatus="FinalApproval Pending ";
							
							tempLists.push(i+1,item.claimId,newcustomerName,newpatientName,convdataTime,strRepass,displayStatus,'<a  href=FinalApprovalPending.html?claimId='+item.claimId+'&policyId='+item.policyId+'&claimEstimate='+amount+'&policyHolderName='+customerName+'&patientName='+patientName+'> View ');
							dataSets.push(tempLists);
							tempLists=[];
						
						}  
					 else{
						 var displayStatus="FinalApproval Pending From Insurer";
							
						 tempLists.push(i+1,item.claimId,newcustomerName,newpatientName,convdataTime,strRepass,displayStatus,'<a  href=FinalApprovalPendingIns.html?claimId='+item.claimId+'&policyId='+item.policyId+'&claimEstimate='+amount+'&policyHolderName='+customerName+'&patientName='+patientName+'> View ');
							dataSets.push(tempLists);
							tempLists=[];
					 }
				 }
				
				 
				 if(item.claimStatus=="approved"){
					 if (item.approverName=="mBroker"||item.approverName=="mbroker" ){
							var displayStatus="Claim Approved By mBroker ";						
							tempLists.push(i+1,item.claimId,newcustomerName,newpatientName,convdataTime,strRepass,displayStatus,'<a  href=FinalApprovalDone.html?claimId='+item.claimId+'&policyId='+item.policyId+'&claimEstimate='+amount+'&policyHolderName='+customerName+'&patientName='+patientName+'> View ');
							dataSets.push(tempLists);
							tempLists=[];
					
					} 
					 else if (item.approverName=="TPA"||item.approverName=="tpa" ){
							var displayStatus="Claim Approved ";						
							tempLists.push(i+1,item.claimId,newcustomerName,newpatientName,convdataTime,strRepass,displayStatus,'<a  href=FinalApprovalDone.html?claimId='+item.claimId+'&policyId='+item.policyId+'&claimEstimate='+amount+'&policyHolderName='+customerName+'&patientName='+patientName+'> View ');
							dataSets.push(tempLists);
							tempLists=[];
					
					}  
					 else{
						 var displayStatus="Claim Approved By Insurance ";
							
						 tempLists.push(i+1,item.claimId,newcustomerName,newpatientName,convdataTime,strRepass,displayStatus,'<a  href=FinalApprovalDone.html?claimId='+item.claimId+'&policyId='+item.policyId+'&claimEstimate='+amount+'&policyHolderName='+customerName+'&patientName='+patientName+'> View ');
							dataSets.push(tempLists);
							tempLists=[];
					 }
				 }
				 
				 			        	
			});
				

		$('#viewAllClaims').DataTable( {
			data: dataSets,
			columns: [
				 { title: "SNo" },
			    { title: "Claim ID" },
			    { title: "Policy Holder" },
			    { title: "Claim Raised For" },
			    { title: "Time Stamp" },
			    { title: "Estimate(in USD)" },			    
			    { title: "Current Status" },
			    {title:"Action"}
			    
			    
			    
			    
			    

			  
			]
   		} );
       
       
       
       });