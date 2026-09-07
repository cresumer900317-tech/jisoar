window.onclick = function(event) 
{
	CheckMaintenanceEnableModalOnclick(event);
	CheckMaintenanceDisableModalOnclick(event);
} 

//-----------

function InitializeJavascript()
{
  var LivelistArray = ControlsToArrayLivelist();
  if (LivelistArray != false){
    ArrayToControlsLivelist(LivelistArray);
  }
  
  var SlotsArray = ControlsToArraySlots();
  if (SlotsArray != false){
    ArrayToControlsSlots(SlotsArray);
  }
}

//-----------

function ControlsToArrayLivelist()
{
  var ErrorCount = 0;
  
  var CompleteArray = [];
  for(var Cluster=0; Cluster<4; Cluster++){
    
    var MessageObj = document.getElementById('tagnames_C'+Cluster);
    
    if (MessageObj != null){
      var CurrentText = MessageObj.value;
      var CurrentArray = CurrentText.split("\n");

      var ClusterResult = [];
      for(var Index=0; Index<128; Index++){
        ClusterResult[Index] = "";
      }
      
      for(var Index=0; Index<128; Index++){
        if (Index < CurrentArray.length){
          CurrentArray[Index] = CurrentArray[Index].split(":");
          
          var WantedAddress = Index;
          
          if (CurrentArray[Index].length >= 2){
            var CurrentAddress = parseInt(CurrentArray[Index][0]);
            var CurrentName    = trim(CurrentArray[Index][1]);
  
            if (CheckNumber(CurrentAddress,0,126) != 0){
              alert(sprintf("네트워크 %s, 라인 %s에 유효하지 않은 주소 (%s)",Cluster+1,CurrentAddress,Index+1));
              ErrorCount++;
            }
            else {
              WantedAddress = CurrentAddress;
            }
  
            if (CheckString(CurrentName,16) != 0){
              var TruncatedName = CurrentName;
              while(CheckString(TruncatedName,16) != 0){
                TruncatedName = TruncatedName.substr(0,TruncatedName.length-1);
              }
              if (confirm(sprintf("네트워크 %s, 주소 %s: 이름의 문자수 초과\n이름: %s\n축약된 이이름이 16문자까지 입니까?\n새로운 이름: %s",Cluster+1,CurrentAddress,CurrentName,TruncatedName)) == true){
                CurrentName = TruncatedName;
              }
              else {
                ErrorCount++;
              }
            }
            ClusterResult[WantedAddress] = CurrentName;
          }
          if (ErrorCount > 0) return false;
        }
      }
      if (ErrorCount > 0) return false;
      CompleteArray.push(ClusterResult);
    }
  }
  return CompleteArray;
}

//-----------

function ControlsToArraySlots()
{
  var ErrorCount = 0;
  var CompleteArray = [];

  for(var Index=0; Index<32; Index++){
    CompleteArray[Index] = "";
  }

  var MessageObj = document.getElementById('tagnames_SLOT');
  
  if (MessageObj != null){
    var CurrentText = MessageObj.value;
    var CurrentArray = CurrentText.split("\n");

    
    for(var Index=0; Index<32; Index++){
      if (Index < CurrentArray.length){
        CurrentArray[Index] = CurrentArray[Index].split(":");
        
        var WantedAddress = Index;
        
        if (CurrentArray[Index].length >= 2){
          var CurrentAddress = parseInt(CurrentArray[Index][0]);
          var CurrentName    = trim(CurrentArray[Index][1]);

          if (CheckNumber(CurrentAddress,1,32) != 0){
            alert(sprintf("라인 %s에서 유효하지 않은 카드 (%s)",CurrentAddress,Index+1));
            ErrorCount++;
          }
          else {
            WantedAddress = CurrentAddress;
          }

          if (CheckString(CurrentName,16) != 0){
            var TruncatedName = CurrentName;
            while(CheckString(TruncatedName,16) != 0){
              TruncatedName = TruncatedName.substr(0,TruncatedName.length-1);
            }
            if (confirm(sprintf("카드 %s: 이름이 너무 김\n이름: %s\n축약된 이이름이 16문자까지 입니까?\n새로운 이름: %s",CurrentAddress,CurrentName,TruncatedName)) == true){
              CurrentName = TruncatedName;
            }
            else {
              ErrorCount++;
            }
          }
          CompleteArray[WantedAddress-1] = CurrentName;
        }
        if (ErrorCount > 0) return false;
      }
    }
    if (ErrorCount > 0) return false;
  }

  return CompleteArray;
}

//-----------

function ArrayToControlsLivelist(LivelistArray)
{
  //update data in edit fields
  for(var Cluster=0; Cluster<4; Cluster++){
    var MessageObj = document.getElementById('tagnames_C'+Cluster);
    if (MessageObj != null){
      
      var NameCount = 0;
      for(var Index=0; Index<LivelistArray[Cluster].length; Index++){
        var CurrentName = LivelistArray[Cluster][Index];
        if ((Index >= 0) && (Index <= 126) && (CurrentName.length > 0)){
          NameCount++;
        }
      }

      var EditValues = "";
      for(var Index=0; Index<LivelistArray[Cluster].length; Index++){
        var CurrentName = LivelistArray[Cluster][Index];
        if ((Index >= 0) && (Index <= 126)){
          if ((NameCount == 0) || (CurrentName.length > 0)){
            EditValues = EditValues + Index + ":" + CurrentName + "\r\n";
          }
        }
      }
      MessageObj.value = EditValues;
    }
  }  
}

//-----------

function ArrayToControlsSlots(SlotsArray)
{
  //update data in edit fields
  var MessageObj = document.getElementById('tagnames_SLOT');
  if (MessageObj != null){
    
    var NameCount = 0;
    for(var Index=0; Index<SlotsArray.length; Index++){
      var CurrentName = SlotsArray[Index];
      if ((Index >= 0) && (Index <= 31) && (CurrentName.length > 0)){
        NameCount++;
      }
    }

    var EditValues = "";
    for(var Index=0; Index<SlotsArray.length; Index++){
      var CurrentName = SlotsArray[Index];
      if ((Index >= 0) && (Index <= 31)){
        if ((NameCount == 0) || (CurrentName.length > 0)){
          EditValues = EditValues + (Index+1) + ":" + CurrentName + "\r\n";
        }
      }
    }
    MessageObj.value = EditValues;
  }  
}

//-----------

function ArrayToCompactArray(ValuesArray,MaxCount)
{
  var CurrentLine  = "";
  var MessageArray = [];
  
  for(var Index=0; Index<MaxCount; Index++){
    
    if (CurrentLine.length > 0){
      CurrentLine = CurrentLine + "\n";
    }
    
    CurrentLine = CurrentLine + Index + "\t" + ValuesArray[Index];
    if (CheckString(CurrentLine,100) != 0){
      MessageArray.push(CurrentLine);
      CurrentLine = "";
    }
  }

  if (CurrentLine.length > 0){
    MessageArray.push(CurrentLine);
    CurrentLine = "";
  }
  
  return MessageArray;
}

//-----------

function SaveTagsnamesClick()
{
  var SlotArray = ControlsToArraySlots();
  var LivelistArray = ControlsToArrayLivelist();
  
  if ((LivelistArray == false) || (SlotArray == false)){
    alert("태그는 저장되지 않았습니다.");
    return;
  }
  
  ArrayToControlsLivelist(LivelistArray);
  ArrayToControlsSlots(SlotArray);

  var MessageArray = ArrayToCompactArray(SlotArray,32);
  var Response = "500\x1F브라우저 에러";
  for(var i=0; i<MessageArray.length; i++){
    var DataParams = "save=data_slotTags:" + encodeURIComponent(MessageArray[i]);
    Response = decodeURIComponent(loadXMLDocSynch("data_srv.cgi", DataParams));
    var ResponseArray = Response.split("\x1F");
    if (parseInt(ResponseArray[0]) != 200){
      alert(ResponseArray[1]);
      return;
    }
  }
  
  for(var Cluster=0; Cluster<4; Cluster++){
    MessageArray = ArrayToCompactArray(LivelistArray[Cluster],128);
    Response = "500\x1F브라우저 에러";
    for(var i=0; i<MessageArray.length; i++){
      var DataParams = "save=data_livelistTags:" + Cluster + ":" + encodeURIComponent(MessageArray[i]);
      Response = decodeURIComponent(loadXMLDocSynch("data_srv.cgi", DataParams));
      var ResponseArray = Response.split("\x1F");
      if (parseInt(ResponseArray[0]) != 200){
        alert(ResponseArray[1]);
        return;
      }
    }
  }

  var args = [];
  SaveSegmentedSettingsCombined("data_srv.cgi",args,"save-tagnames",1);
}
