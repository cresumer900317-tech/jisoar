
var TimerHandleData = null;

var xmlhttpStatusData = null;
var xmlhttpActions    = null;
var StatusDataTimeout = 0;

var MaxChannels = 20;

var ResetRequest = [0,0,0,0];

var ModImgPath = "var_cb/modimg/"

//-----------

function onTimeoutData()
{
  StatusDataTimeout = 0;
  xmlhttpStatusData.onreadystatechange = function() {}
  xmlhttpStatusData.abort();
}

//-----------

function onStateChangeData()
{
  if (xmlhttpStatusData != null){
    if (xmlhttpStatusData.readyState == 4){
      if (xmlhttpStatusData.status == 200){

        var Response = decodeURIComponent(xmlhttpStatusData.responseText);

        var ControlVars = [];

        ControlVars = Response.split("\x1D");

        var StationCount = 0;
        var Livelist = [];
        var ClusterInfo = [];
        var ModuleInfo = [];
        var MainModuleInfo = [];
        var LivelistTags = [];
        var AltLivelist = [];

        if (ControlVars.length >= 23){
          
          StationCount = parseInt(ControlVars[1]);
          
          Livelist.push(ControlVars[2].split("\x1F"));
          Livelist.push(ControlVars[3].split("\x1F"));
          Livelist.push(ControlVars[4].split("\x1F"));
          Livelist.push(ControlVars[5].split("\x1F"));
          
          ClusterInfo = ControlVars[6].split("\x1E");
          ModuleInfo  = ControlVars[7].split("\x1E");
          MainModuleInfo = ControlVars[8].split("\x1F");
          
          LivelistTags.push(ControlVars[9].split("\x1F"));
          LivelistTags.push(ControlVars[10].split("\x1F"));
          LivelistTags.push(ControlVars[11].split("\x1F"));
          LivelistTags.push(ControlVars[12].split("\x1F"));
          
          AltLivelist.push(ControlVars[13].split("\x1F"));
          AltLivelist.push(ControlVars[14].split("\x1F"));
          AltLivelist.push(ControlVars[15].split("\x1F"));
          AltLivelist.push(ControlVars[16].split("\x1F"));
          AltLivelist.push(ControlVars[17].split("\x1F"));
          AltLivelist.push(ControlVars[18].split("\x1F"));
          AltLivelist.push(ControlVars[19].split("\x1F"));
          AltLivelist.push(ControlVars[20].split("\x1F"));
          AltLivelist.push(ControlVars[21].split("\x1F"));
          AltLivelist.push(ControlVars[22].split("\x1F"));
        }
        
        for(var i=0; i<AltLivelist.length; i++){
          for(var j=0; j<AltLivelist[i].length; j++){
            if (AltLivelist[i][j] == ""){
              AltLivelist[i].splice(j,1);
            }            
          }
        }
        
        Livelist = FilterUnchecked(StationCount,Livelist);
        WriteLivelist(ClusterInfo,StationCount,Livelist,LivelistTags,AltLivelist);
        
        WriteModuleInfo(ModuleInfo);
        WriteMainModuleInfo(MainModuleInfo);
        
        onTimeoutData();
      }
    }
  }
}

//-----------

function PeriodicTimerUpdateStatusData()
{
  if (StatusDataTimeout > 0){
    StatusDataTimeout--;
    return;
  }

  if (xmlhttpStatusData != null){
    xmlhttpStatusData.abort();
  }

  var ActionParams = "return=0";
  for(var i=0; i<ResetRequest.length; i++){
    if (ResetRequest[i] != 0){
      ActionParams = "action=ResetLivelist:"+i+":"+ResetRequest[i];
      ResetRequest[i] = 0;
    }
  }

  var DataParams     = "data=StationCount+Livelist:0+Livelist:1+Livelist:2+Livelist:3+ClusterStatus+ModuleInfo+MainModuleInfo+LivelistTags:0+LivelistTags:1+LivelistTags:2+LivelistTags:3";
  DataParams = DataParams + "+FF-Livelist:0+FF-Livelist:1+FF-Livelist:2+FF-Livelist:3+FF-Livelist:4+FF-Livelist:5+FF-Livelist:6+FF-Livelist:7+FF-Livelist:8+FF-Livelist:9";
  var TotalParams    = ActionParams + "&" + DataParams;

  xmlhttpStatusData = loadXMLDocASynch("data_srv.cgi", TotalParams, onStateChangeData, onTimeoutData);
  StatusDataTimeout = 10;
}


//-----------

function InitializeJavascript()
{
  StatusDataTimeout = 0;

  // start the timer(s)
  PeriodicTimerUpdateStatusData();

  var AutoRefreshInterval = 1 * 1000;
  if (AutoRefreshInterval < 1000) AutoRefreshInterval = 1000;
  TimerHandleData = setInterval('PeriodicTimerUpdateStatusData()',AutoRefreshInterval);
}

//-----------

function FilterUnchecked(StationCount, Livelist)
{
  for(var nw=0; nw<4; nw++){
    var CheckboxId = "display_nw"+(nw+1);
    if (GetCheckBoxValue(CheckboxId,1) != 0){
      for(var i=0; i<StationCount; i++){
        Livelist[nw][i] = parseInt(Livelist[nw][i],16);
      }
    }
    else {
      for(var i=0; i<StationCount; i++){
        Livelist[nw][i] = 0;
      }
    }
  }
  return Livelist;
}

//-----------


function ApplyChannel(ChannelData,LivelistTagArray)
{
  var ChListId   = "ch" +ChannelData.Channel;
  var DevListId  = "dev"+ChannelData.Channel;
  
  var ChannelName  = "&nbsp;";
  var ChannelClass = "NoStations";
  
  var DeviceList = "&nbsp;";
  
  var ChannelNumber = (ChannelData.Channel % 2)+1;
  
  if (ChannelData.Network >= 0){

    ChannelClass = "Channel"+ChannelNumber; 
    DeviceList = GetDeviceListHtml(ChannelData,LivelistTagArray);

    var RedText = "&nbsp;";
    if (ChannelData.RedundantEnable != 0){
      ChannelClass = "Channel"+ChannelNumber+"RedEr"; 
      if (ChannelData.RedundantOk != 0){
        ChannelClass = "Channel"+ChannelNumber+"RedOk"; 
      }
      RedText = "RED";
    }

    if (ChannelNumber == 1){
      ChannelName = RedText+"<br>"+"ch "+ChannelNumber;
    }
    
    if (ChannelNumber == 2){
      ChannelName = "ch "+ChannelNumber+"<br>"+RedText;
    }
  }
  
  if (ChannelData.AltDevices){
    ChannelClass = "Channel"+ChannelNumber; 
    DeviceList = GetAltDeviceListHtml(ChannelData);
    ChannelName = "<br>"+"ch "+ChannelNumber;
  }
  
  SetInnerHtmlValue(ChListId,ChannelName );
  SetClass(ChListId,ChannelClass); 
  SetInnerHtmlValue(DevListId,DeviceList);
}

//-----------

function ApplyInternalChannel(ChannelData,LivelistTagArray)
{
  var ChListId   = "ch_int";
  var DevListId  = "dev_int";
  
  var ChannelName  = "&nbsp;";
  var ChannelClass = "NoStations";
  
  var DeviceList = "&nbsp;";
  
  if (ChannelData.length > 0){
    ChannelName = "기본의 (Internal)";
    ChannelClass = "Channel1"; 
    DeviceList = GetDeviceListHtml(ChannelData,LivelistTagArray);
  }
  
  SetInnerHtmlValue(ChListId,ChannelName );
  SetClass(ChListId,ChannelClass); 
  SetInnerHtmlValue(DevListId,DeviceList);
}

//-----------

function IsDeviceActive(LivelistValue)
{
  LivelistValue = parseInt(LivelistValue);
  if ((LivelistValue & 0x8) == 0) return false;
  return true;
}

//-----------

function GetDevicePositionInLivelistArray(ArrayWithAddresses,Address)
{
  var FoundIndex = -1;
  for(var i=0; i<ArrayWithAddresses.length; i++){
    if (ArrayWithAddresses[i].Address == Address){
      FoundIndex = i;
      break;
    }
  }
  return FoundIndex;
}

//-----------

function WriteLivelist(ChannelInfo,StationCount,LivelistArray,LivelistTagArray, AltLivelist)
{
  // prepare the arrays
  var ChannelDevices = [];
  var InternalDevices = [];
  
  for(var ch=0; ch<MaxChannels; ch++){
    var CurrentModule = ChannelInfo[parseInt(ch/2)].split("\x1F");
    var CurrentChannel = parseInt(CurrentModule[ch % 2],16);
    
    var CurrentNetwork = CurrentChannel & 0x07;
    if ((CurrentChannel & 0x80) == 0) CurrentNetwork = -1;
    
    var CurrentRedEnabled = 0;
    if ((CurrentChannel & 0x10) != 0) CurrentRedEnabled = 1;

    var CurrentRedOk = 0;
    if ((CurrentChannel & 0x40) != 0) CurrentRedOk = 1;
    
    ChannelDevices.push({Channel: ch, Network: CurrentNetwork, Devices: [], RedundantEnable: CurrentRedEnabled, RedundantOk: CurrentRedOk});
  }
  
  // fill the arrays
  for(var c=0; c<LivelistArray.length; c++){
    for(var i=0; i<StationCount; i++){
      var LivelistValue = LivelistArray[c][i];
      var ChannelNo = (LivelistValue >> 10) & 0x1F;
    
      if (ChannelNo > 0){
        ChannelNo--; // 0..19,or internal
        if (ChannelNo < MaxChannels){
          if (IsDeviceActive(LivelistValue) == true){
            ChannelDevices[ChannelNo].Network = c;
          }
          var Position = GetDevicePositionInLivelistArray(ChannelDevices[ChannelNo].Devices,i);
          if (Position < 0){ // if not found in array, add the device
            ChannelDevices[ChannelNo].Devices.push( {Address : i, Livelist : LivelistValue} );
          }
          else{ 
            if (IsDeviceActive(LivelistValue) == true){ // active stations have higher priority than non-active ones
              ChannelDevices[ChannelNo].Devices[Position].Livelist = LivelistValue;
            }
          }
        }
        else {
          InternalDevices.push( {Address : i, Livelist : LivelistValue, Network : c} );
        }
      }
    }
  }
  
  for (var i=0; i<AltLivelist.length; i++){
    if (AltLivelist[i].length > 0){
      ChannelDevices[i*2].Network = -1;
      ChannelDevices[i*2].RedundantEnable = 0;
      ChannelDevices[i*2].RedundantOk = 0;
      ChannelDevices[i*2].AltDevices = [];
      for(var j=0; j<AltLivelist[i].length; j++){
        var LivelistValue = parseInt(AltLivelist[i][j],16);
        if (LivelistValue != 0){
          ChannelDevices[i*2].AltDevices.push( {Address : j, Livelist : LivelistValue} );
        }
      }
    }
  }
   
  // fill the table
  for(var ch=0; ch<MaxChannels; ch++){
    ApplyChannel(ChannelDevices[ch],LivelistTagArray);
  }
  ApplyInternalChannel(InternalDevices,LivelistTagArray);
}

//-----------

function WriteModuleInfo(SubModInfo)
{                             
  var AvailableImages = Array("00010001.png","00010002.png","00010004.png","00010005.png","00010006.png","00010008.png","00010009.png","0001000A.png","0001000B.png","0001000C.png","00010300.png","00010400.png","00010401.png","00010500.png","00010501.png","00010700.png","00010800.png","00010802.png","0001FF00.png");
  
  for(var i=0; i<10; i++){
    var ColNr = (i+1);
    var ImgSubmodId    = "img_mod_sub"+ColNr;
    var SlotSubmodId   = "slot_mod_sub"+ColNr;
    var StatusSubmodId = "status_mod_sub"+ColNr;
    var HintSubmodId   = "hint_mod_sub"+ColNr;

    var CurrentModule = [];
    if (SubModInfo.length > i){
      CurrentModule = SubModInfo[i].split("\x1F");
    }
    if (CurrentModule.length < 7){
      var DispText = "";
      var StatusCode = parseInt(CurrentModule[0]);
      var HintText = "";
            
      if (StatusCode != 100){  // if not empty: error/updating
        DispText = GetTextForModuleStatus(StatusCode);
        SetInnerHtmlValue(SlotSubmodId, (i+1));
        SetInnerHtmlValue(StatusSubmodId, DispText);
        SetImageSrc(ImgSubmodId,ModImgPath + "error.png");
        if (StatusCode == 102){
          HintText = AddToolTip(HintText,"Module contains an error. Remove the module and reinsert it.","channelListStyle");
        }
        else if (StatusCode == 103){
          HintText = AddToolTip(HintText,"Module is not supported. Head Station update required.","channelListStyle");
        }
        SetInnerHtmlValue(HintSubmodId,HintText);
      }
      else {
        SetInnerHtmlValue(SlotSubmodId, "");
        SetInnerHtmlValue(StatusSubmodId, DispText);
        SetImageSrc(ImgSubmodId,ModImgPath + "empty.png");
        SetInnerHtmlValue(HintSubmodId,HintText);
      }
      
    }
    else {
      var VendorId = parseInt(CurrentModule[1]);
      VendorId = VendorId.toString(16);
      while(VendorId.length < 4){
        VendorId = "0"+VendorId;
      }
      VendorId = VendorId.toUpperCase();
      
      var ModuleId = parseInt(CurrentModule[3]);
      ModuleId = ModuleId.toString(16);
      while(ModuleId.length < 4){
        ModuleId = "0"+ModuleId;
      }
      ModuleId = ModuleId.toUpperCase();
      
      var BackgroundFilename = VendorId + ModuleId + ".png";
      
      var HintText = "";
      if (IsItemInArray(AvailableImages,BackgroundFilename) == false){ 
        BackgroundFilename = "unknown.png";
        HintText = AddToolTip(HintText,"Module picture not available. Head Station update required.","channelListStyle");
      }
      else {
        if (CurrentModule[10].length > 0){
          // add tooltip with module name
          HintText = AddToolTip(HintText,CurrentModule[10],"channelListStyle");
        }
      }
     
      SetInnerHtmlValue(SlotSubmodId,(i+1));
      SetInnerHtmlValue(StatusSubmodId, "");
      SetInnerHtmlValue(HintSubmodId,HintText);
      SetImageSrc(ImgSubmodId,ModImgPath+BackgroundFilename);
    }
  }
}

//-----------

function WriteMainModuleInfo(MainModuleInfo)
{
  if (MainModuleInfo.length >= 8){
    var HintText = "";
    if (MainModuleInfo[7].length > 0){
      HintText = AddToolTip(HintText,MainModuleInfo[7],"channelListStyle");
    }
  }
  SetInnerHtmlValue("slot_mod_main", "0");
  SetInnerHtmlValue("hint_mod_main", HintText);
}

//-----------

function ShowResetLiveListModal(cluster)
{
	SetCheckBoxValue("CheckboxIncludeIdentNrs"+cluster,true);
	SetVisibility("ResetLivelistModalBox"+cluster,true);
}

//-----------

function HideResetLivelistModal(cluster)
{
	SetVisibility("ResetLivelistModalBox"+cluster,false);
}

//-----------

window.onclick = function(event) 
{
	for(var i=0; i<4; i++){
	  if (event.target == document.getElementById("ResetLivelistModalBox"+i)) {
	    HideResetLivelistModal(i);
	    return;
	  }
	}
	CheckMaintenanceEnableModalOnclick(event);
	CheckMaintenanceDisableModalOnclick(event);
} 

//-----------

function ResetLiveList(cluster,ResetIdentNrs)
{
  cluster = parseInt(cluster);
  ResetRequest[cluster] = 1;
  if (ResetIdentNrs === true) ResetRequest[cluster] = 2;
  PeriodicTimerUpdateStatusData();
  HideResetLivelistModal(cluster);
}

//-----------

function ResetFFLiveList()
{
  var ActionParam = "action=resetfflivelist";
  xmlhttpActions = loadXMLDocASynch("data_srv.cgi", ActionParam, onStateChangeActions,onTimeoutActions);
}

//-----------

function onTimeoutActions()
{
  xmlhttpActions.onreadystatechange = function() {}
  xmlhttpActions.abort();
}

//-----------

function onStateChangeActions()
{
  if (xmlhttpActions != null){
    if (xmlhttpActions.readyState == 4){
      if (xmlhttpActions.status == 200){

        var Response = decodeURIComponent(xmlhttpActions.responseText);

        var Result_arr = [];
        Result_arr = Response.split('\x1F');
        if (Result_arr.length == 2){
          if (parseInt(Result_arr[0]) != 200){
  	        alert(Result_arr[1]);
  	      }
        }

        onTimeoutActions();
      }
    }
  }
}

//-----------
