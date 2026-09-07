
window.onclick = function(event) 
{
  if (event.target == document.getElementById("SaveMasterSettingsModalBox")) {
    HideSaveBoxModal();
    return;
  }	
	CheckMaintenanceEnableModalOnclick(event);
	CheckMaintenanceDisableModalOnclick(event);
} 

function InitializeJavascript()
{
  InitializeJavascriptNetworks();
  InitializeJavascriptMaster();
}


var TimerHandleData = null;

var xmlhttpStatusData = null;
var StatusDataTimeout = 0;

var xmlhttpApplySettings = null;

var NetworkLicense = 0;
var RedundantLicense = 0;

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

        var SectionVars = [];

        var ClusterVars = [];
        var ModuleVars  = [];
        var MasterInfo  = "";

        SectionVars = Response.split("\x1d");
        if (SectionVars.length >= 3){
          ClusterVars  = SectionVars[0].split("\x1E");
          ModuleVars   = SectionVars[1].split("\x1E");
          MasterInfo   = SectionVars[2].split("\x1E");
        }

        FillClusterTable(ClusterVars,ModuleVars);

				var Warnings = [];
      	Warnings = AddWarning(Warnings,CheckModuleSlotTypeWarning(ModuleVars));
				DisplayWarnings(Warnings,"warnings_area");
				
				UpdateMasterInfo(MasterInfo);

        onTimeoutData();
      }
    }
  }
}

//-----------

function GetNetworkWarningText()
{
  return sprintf("네트워크 %s용 라이센스만 갖고 있습니다.", GenerateEnumeration(1,NetworkLicense) );
}

//-----------

function GetRedundantWarningText()
{
  return sprintf("네트워크 %s용 이중화 라이센스만 갖고 있습니다.",GenerateEnumeration(1,RedundantLicense) );
}

//-----------

function FillClusterTable(ClusterVars,ModuleVars)
{
  var TableObj = document.getElementById("ClusterList");

  var ContentRowCount = 0;

	for(var i=0; i<ClusterVars.length; i++){
		var TempArr = [];
		TempArr = ClusterVars[i].split("\x1F");
		if (TempArr.length > 1){
			ContentRowCount = (i+1);
		}
	}

	if (ContentRowCount < 1) ContentRowCount = 1;
	var TableRowCount = (ContentRowCount + 1); // header row always there

  while (TableObj.rows.length < TableRowCount){
  	// too little rows for content: add rows to end of table
  	AddRow(TableObj,1,new Array("Center","Left","Center","Center","Center","Center","Center","Center"));
  }

  while (TableObj.rows.length > TableRowCount){
  	// too much rows for content: remove rows from end of table
  	RemoveRow(TableObj,1);
  }

	for(var i=0; i<ContentRowCount; i++){
		FillClusterRow(i,ClusterVars[i],ModuleVars[i]);
	}
}

//-----------

function FillClusterRow(RowNr, BothChannelContent, ModuleContent)
{
	var ChannelData = [];
	var ModuleData  = [];
	ChannelData = BothChannelContent.split("\x1F");
	ModuleData  = ModuleContent.split("\x1F");

	var Errors = 0;

	var Cluster     = [];
	var Redundancy  = [];
	var Linkstate   = [];
	var NhwSwSwitch = [];

	for(var i=0; i<ChannelData.length; i++){
	  ChannelData[i] = parseInt(ChannelData[i],16);

		if ((ChannelData[i] & 0x80) != 0){
		  var ClusterValue = (ChannelData[i] & 0x07);
		  if (ClusterValue == 0x07){
   		  Cluster.push("N/C");  // invalid network
		  }
		  else {
   		  Cluster.push((ClusterValue & 0x03)+1);
   		}

   		var RedundancyValue = GetOnOffText(ChannelData[i] & 0x10);
   		if (ChannelData[i] & 0x10){
   		  RedundancyValue = RedundancyValue+" "+GetColorBallHtml(ChannelData[i] & 0x40);
   		}
 	  	Redundancy.push(RedundancyValue);

   		var LinkValue = GetOnOffText(ChannelData[i] & 0x08);
 	  	Linkstate.push(LinkValue);

 		  NhwSwSwitch.push(GetSwDswText(ChannelData[i] & 0x20));
 		}
	}

	var VenId = parseInt(ModuleData[1]);
	var ModId = parseInt(ModuleData[3]);
	var Version = ModuleData[6];

	var ModuleName = GetTextForModuleStatus(ModuleContent);
	if (ModuleData.length >= 8){
	  ModuleName = CreateSpecialLinkForModule(VenId ,ModId, RowNr, ModuleData[4]);
	  if (ModuleData[10].length > 0){
	    ModuleName = ModuleName + "<br>" + ModuleData[10];
	  }
	}

	FillModuleCell(RowNr,"Name",-1,ModuleName);
	
	if (Version != undefined){
	  Version = Version.match(/[0-9]{1,}/gi);
	}

	for( var i=0; i<Cluster.length; i++){
    ShowHideChannel(RowNr,i,true,ModId,VenId,Version);
    if (GetDipSwitchSupport(ModId,VenId,Version) == true){
      FillModuleCell(RowNr,"HwSw",i,NhwSwSwitch[i]);
    }
    else {
      FillModuleCell(RowNr,"HwSw",i,"N/A");
    }
    FillModuleCell(RowNr,"CurrentNetwork",i,Cluster[i]);
    FillModuleCell(RowNr,"CurrentRedundancy",i,Redundancy[i]);
    FillModuleCell(RowNr,"CurrentLink",-1,Linkstate[i]);
  }
  
  for(var i=Cluster.length; i<2; i++){
  	ShowHideChannel(RowNr,i,false,0,0,[]);
  }
}

//-----------

function FillModuleCell(RowNr, CellName, ChannelNr, Context)
{
	if (ChannelNr >= 0){
  	var DivId = "row%s_%s_%s";
	  DivId = sprintf(DivId,RowNr,ChannelNr,CellName);
    SetInnerHtmlValue(DivId,Context);
	}
	else {
  	var DivId = "row%s_%s";
	  DivId = sprintf(DivId,RowNr,CellName);
    SetInnerHtmlValue(DivId,Context);
	}
}

//-----------

function GetRedundancySupport(ModId, VenId,VersionArray)
{
  var value = true;
  
  if ((VenId == 1) && (ModId == 0x0501)) value = false;   // Profibus slave
  if ((VenId == 1) && (ModId == 0x0800)) value = false;   // pa coupler
  if ((VenId == 1) && (ModId == 0x0802)) value = false;   // ff module
  if ((VenId == 1) && (ModId == 0x000A)) value = false;   // fo-v3 MM
  if ((VenId == 1) && (ModId == 0x000B)) value = false;   // fo-v3 SM
  if ((VenId == 1) && (ModId == 0x000C)) value = false;   // fo-v3 XM

  return value;
}

//-----------

function GetLinkSupport(ModId, VenId,VersionArray)
{
  var value = false;
  
  if ((VenId == 1) && (ModId == 0x0800)){
    var Major = parseInt(VersionArray[0]);
    var Minor = parseInt(VersionArray[1]);
    var Total = (Major * 1000) + Minor;
    if (Total >= 2010){
      value = true;   // pa coupler
    }
  }
  
  return value;
}

//-----------

function GetRepeaterSupport(ModId, VenId,VersionArray)
{
  var value = true;
  
  if ((VenId == 1) && (ModId == 0x0802)) value = false;   // ff module

  return value;
}

//-----------

function GetDipSwitchSupport(ModId, VenId,VersionArray)
{
  var value = true;
  
  if ((VenId == 1) && (ModId == 0x0802)) value = false;   // ff module

  return value;
}

//-----------

function ShowHideChannel(RowNr,ChannelNr,ShowOrHide,ModId,VenId,VersionArray)
{
  var DivIdName = "row%s_Ch%sName";
  DivIdName = sprintf(DivIdName,RowNr,ChannelNr);
	SetVisibility(DivIdName,ShowOrHide);

  var DivIdDipSw = "row%s_%s_HwSw";
  DivIdDipSw = sprintf(DivIdDipSw,RowNr,ChannelNr);
	SetVisibility(DivIdDipSw,ShowOrHide);

  var DivIdNwSel = "row%s_%s_Network";
  DivIdNwSel = sprintf(DivIdNwSel,RowNr,ChannelNr);
  if (ShowOrHide == true){
    var RepeaterForThisModule = GetRepeaterSupport(ModId,VenId,VersionArray);
	  SetVisibility(DivIdNwSel,RepeaterForThisModule);
	}
	else {
	  SetVisibility(DivIdNwSel,ShowOrHide);
	}
	
	var DivId = "row%s_%s_Redundancy";
	DivId = sprintf(DivId,RowNr,ChannelNr);
	if (ShowOrHide == true){ // show
	  var RedundForThisModule = GetRedundancySupport(ModId,VenId,VersionArray);
	  SetVisibility(DivId,RedundForThisModule);
	}
	else { // hide
	  SetVisibility(DivId,ShowOrHide);
	}

  if (ChannelNr <= 0){
  	var DivId = "row%s_Link";
  	DivId = sprintf(DivId,RowNr);
  	if (ShowOrHide == true){ // show
  	  var LinkForThisModule = GetLinkSupport(ModId,VenId,VersionArray);
  	  SetVisibility(DivId,LinkForThisModule);
  	}
  	else { // hide
  	  SetVisibility(DivId,ShowOrHide);
  	}
  }
	
  FixFooter();
}

//-----------

function CheckModuleSlotTypeWarning(ModuleVars)
{
	var InvalidModulePositions = [];
	var ErrorText = "";

	for(var i=10; i<ModuleVars.length; i++){
    var CurrentModule = ModuleVars[i].split("\x1F");
		if (CurrentModule.length > 1){
			if (CurrentModule[6] & 0x00000001){ // hs-mod in ls-area
				InvalidModulePositions.push(i+1);
			}
		}
	}

	if (InvalidModulePositions.length > 0){
		// show the warning
		if (InvalidModulePositions.length == 1){
		  ErrorText = sprintf("슬롯 %s의 모듈은 최초 10 슬롯중 하나에서 사용되어야 합니다.(고속 영억). 이 슬롯에서는 동작하지 <b>않습</b>니다!",InvalidModulePositions.join("") );
		}
		else {
			var LastElement = InvalidModulePositions.pop();
			ErrorText = sprintf("슬롯 %s 과 %s의 모듈은 최초의 10슬롯중 하나에서만 사용되어야 합니다(고속 영억). 이슬롯들에서는 동작하지 <b>않습</b>니다!", InvalidModulePositions.join(", "), LastElement);
		}
	}

	return ErrorText;
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

  var DataParams     = "data=ClusterStatus+ModuleInfo+Hubread-info";
  xmlhttpStatusData = loadXMLDocASynch("data_srv.cgi", DataParams, onStateChangeData, onTimeoutData);
  StatusDataTimeout = 10;
}


//-----------

function InitializeJavascriptNetworks()
{
  NetworkLicense = 4;
  RedundantLicense = Math.min(4,NetworkLicense);

  //-----------remove network names which are not licensed

  if (NetworkLicense == 0){
    // disable entire table
    SetVisibility("network_name_table",false);
  }
  else {
    // disable not licensed rows
    for(var i=NetworkLicense; i<4; i++){
      var id_code = "network_name_c"+(i+1);
      SetVisibility(id_code,false);
    }
  }

  //-----------remove options which are not licensed

  for(var i=0; i<10; i++){   // high speed module count (10 for now)
    for(var c=0; c<2; c++){  // channel count (2 for now)
      var SettingCls_id = "row%s_%s_SelectNetwork";
      SettingCls_id = sprintf(SettingCls_id,i,c);

  	  var SettingObjNw = document.getElementById(SettingCls_id);
  	  if (SettingObjNw != null){
  	    for(var b=0; b<4; b++){
  	      var CurrentOption = SettingObjNw.options[b];
  	      if (CurrentOption != null){
  	        if (parseInt(CurrentOption.value) > NetworkLicense){
  	          SettingObjNw.remove(b);
  	          b--;
  	        }
  	      }
  	    }
  	  }

  	  if (RedundantLicense == 0){ // redundancy disabled at all
        var SettingRed_id = "row%s_%s_SetRedundancy";
        SettingRed_id = sprintf(SettingRed_id,i,c);        
        SetCheckBoxValue(SettingRed_id,false);
	      SetEnabled(SettingRed_id,false);
	    }
  	}
  }



  //--------------------------------

  StatusDataTimeout = 0;

  // start the timer(s)
  PeriodicTimerUpdateStatusData();

  var AutoRefreshInterval = 1 * 1000;
  if (AutoRefreshInterval < 1000) AutoRefreshInterval = 1000;
  TimerHandleData = setInterval('PeriodicTimerUpdateStatusData()',AutoRefreshInterval);

	SetSelectBoxValue("row0_0_SelectNetwork",'1');
	SetSelectBoxValue("row0_1_SelectNetwork",'1');
	SetSelectBoxValue("row1_0_SelectNetwork",'1');
	SetSelectBoxValue("row1_1_SelectNetwork",'1');
	SetSelectBoxValue("row2_0_SelectNetwork",'1');
	SetSelectBoxValue("row2_1_SelectNetwork",'1');
	SetSelectBoxValue("row3_0_SelectNetwork",'1');
	SetSelectBoxValue("row3_1_SelectNetwork",'1');
	SetSelectBoxValue("row4_0_SelectNetwork",'1');
	SetSelectBoxValue("row4_1_SelectNetwork",'1');
	SetSelectBoxValue("row5_0_SelectNetwork",'1');
	SetSelectBoxValue("row5_1_SelectNetwork",'1');
	SetSelectBoxValue("row6_0_SelectNetwork",'1');
	SetSelectBoxValue("row6_1_SelectNetwork",'1');
	SetSelectBoxValue("row7_0_SelectNetwork",'1');
	SetSelectBoxValue("row7_1_SelectNetwork",'1');
	SetSelectBoxValue("row8_0_SelectNetwork",'1');
	SetSelectBoxValue("row8_1_SelectNetwork",'1');
	SetSelectBoxValue("row9_0_SelectNetwork",'1');
	SetSelectBoxValue("row9_1_SelectNetwork",'1');
}

//-----------

function SaveModuleConfigClick()
{
  if (confirm("네트워크 구성을 저장하시겠습니까?") == true){
    SaveModuleConfig();
  }
}

//-----------

function SaveModuleConfig()
{
  var args = [];

  var HighestSelectedNetwork = 0;
  var HighestSelectedRedundantNetwork = 0;

  for(var i=0; i<10; i++){   // high speed module count (10 for now)
    for(var c=0; c<2; c++){  // channel count (2 for now)

      var SettingCls_id = "row%s_%s_SelectNetwork";
      SettingCls_id = sprintf(SettingCls_id,i,c);

  	  var SettingObjNw = document.getElementById(SettingCls_id);
  	  if (SettingObjNw != null){
      	var SettingName = "setting_Module"+(i+1)+"-Ch"+(c+1)+"-Cluster:";
    	  var SettingValue = GetSelectBoxValue(SettingObjNw.id,-1);
    	  if (HighestSelectedNetwork < SettingValue) HighestSelectedNetwork = SettingValue;
  	    args.push(SettingName + SettingValue);
  	  }

      var SettingRed_id = "row%s_%s_SetRedundancy";
      SettingRed_id = sprintf(SettingRed_id,i,c);        

      var SettingObjRed = document.getElementById(SettingRed_id);
      if (SettingObjRed != null){
        var SettingName = "setting_Module"+(i+1)+"-Ch"+(c+1)+"-Redundant:";
        var SettingValue = GetCheckBoxValue(SettingObjRed.id,-1);
        if (HighestSelectedRedundantNetwork < SettingValue) HighestSelectedRedundantNetwork = SettingValue;
        args.push(SettingName + SettingValue);
      }

    }

    var SettingLink_id = "row%s_SetLink";
    SettingLink_id = sprintf(SettingLink_id,i);        

    var SettingObjLink = document.getElementById(SettingLink_id);
    if (SettingObjLink != null){
      var SettingName = "setting_Module"+(i+1)+"-Link:";
      var SettingValue = GetCheckBoxValue(SettingObjLink.id,-1);
      args.push(SettingName + SettingValue);
    }    
  }

  for(var i=0; i<4; i++){
	  var ClusterName = GetTextValue("name_cluster"+(i+1),"Network "+(i+1));
	  var ClusterTimeout = parseInt(GetTextValue("timeout_cluster"+(i+1),"5"));
	  
 	  if (CheckString(ClusterName,32) != 0){
      alert(sprintf("에러: 네트워크명은 32문자를 초과할 수 없습니다. (네트워크 %s)", (i+1) ) );
      return;
	  }

 	  if (CheckNumber(ClusterTimeout,1,60) != 0){
      alert(sprintf("에러 : 네트워크 실시간상태 타임아웃은 1에서 60 범위이어햐 합니다. (네트워크 %s)", (i+1) ) );
      return;
	  }

    args.push("setting_Name-C"+(i+1)+":" + ClusterName);
    args.push("setting_Timeout-C"+(i+1)+":" + ClusterTimeout);
  }

  //-------
  
  var FFTimeout = parseInt(GetTextValue("timeout_ff","30"));
  
  if (CheckNumber(FFTimeout,1,120) != 0){
    alert(sprintf("Error: The FF LIVELIST TIMEOUT must be a value between 1 and 120."));
    return;
  }

  args.push("setting_Timeout-FF:" + FFTimeout);
  
  //-------

  if (HighestSelectedNetwork > NetworkLicense){
    alert(sprintf("설정후 저장이 제한됨. 네트워크 %s만 라이센스 보유.",GenerateEnumeration(1,NetworkLicense) ) );
  }

  if (HighestSelectedRedundantNetwork > RedundantLicense){
    alert(sprintf("설정후 저장이 제한됨. 이중화 라이센스가 네트워크 %s에만 해당됨.",GenerateEnumeration(1,RedundantLicense)) );
  }

  return SaveSegmentedSettingsCombined("data_srv.cgi",args,"save-settings",1);
}

//-----------

function ApplyModuleConfigClick()
{
  if (confirm("네트워크 구성을 저장하고 적용하시겠습니까?") == true){
    var Result = SaveModuleConfig();
    if (Result.Code == 200) ApplyModuleConfig();
  }
}

//-----------

function ApplyModuleConfig()
{
  xmlhttpApplySettings = loadXMLDocASynch("data_srv.cgi", "action=ApplyNetworkConfig", onStateChangeApplySettings, onTimeoutApplySettings);
}

//-----------

function onTimeoutApplySettings()
{
  xmlhttpApplySettings.onreadystatechange = function() {}
  xmlhttpApplySettings.abort();
}

//-----------

function onStateChangeApplySettings()
{
  if (xmlhttpApplySettings != null){
    if (xmlhttpApplySettings.readyState == 4){
      if (xmlhttpApplySettings.status == 200){

        var Response = decodeURIComponent(xmlhttpApplySettings.responseText);
        var Result = [];
        Result = Response.split("\x1F");

        if (Result.length > 1){
          alert(Result[1]);
        }
        else {
          alert(Result[0]);
        }

        onTimeoutApplySettings();
      }
    }
  }
}

//----------- hub master functions ---------------------------


function GetGlobalMasterStateText(MasterState, CurrentNetwork)
{
  var StatusText = "알수없음";
  // keep the cases below in sync with HubMaster.h
  
  if ((MasterState & 0x80000000) == 0){
    // if no error state, filter global states
    switch(MasterState & 0x7FFFF000){
      
      case 0x00000000: // HM_GLOBAL_STATE_INACTIVE
        StatusText = sprintf("활성화되지 않은");
        break;
        
      case 0x00001000: // HM_STATE_SELECTING_NETWORK
        StatusText = sprintf("Selecting network %s",CurrentNetwork);
        break;
        
      case 0x00002000: // HM_GLOBAL_STATE_SET_GET_BUS_PARAMETERS
        StatusText = sprintf("Setting bus parameters for network %s",CurrentNetwork);
        break;
        
      case 0x00003000: // HM_GLOBAL_STATE_DETECT_BUS_PARAMETERS
        StatusText = sprintf("Detecting bus parameters for network %s",CurrentNetwork);
        break;
        
      case 0x00004000: // HM_GLOBAL_STATE_GOING_ONLINE
        StatusText = sprintf("Waiting for token to go online on network %s",CurrentNetwork);
        break;
        
      case 0x00005000: // HM_GLOBAL_STATE_ONLINE
        StatusText = sprintf("Controller is scanning network %s",CurrentNetwork);
        break;
        
      case 0x00006000: // HM_GLOBAL_STATE_GOING_OFFLINE
        StatusText = sprintf("Controller is going offline on network %s",CurrentNetwork);
        break;
          
      default: // unknown state?
        StatusText = sprintf("Controller is in unknown state %s on network %s",MasterState,CurrentNetwork);
        break;
    
    }
  }
  else {
    // if error state
    switch(MasterState){
        
      case 0x80000000: // HM_GLOBAL_STATE_ERROR
        StatusText = sprintf("Controller is in error state on network %s",CurrentNetwork);
        break;
  
      case 0x80000001: // HM_GLOBAL_STATE_NO_LICENSE
        StatusText = sprintf("No controller or monitoring license for network %s",CurrentNetwork);
        break;
  
      default: // unknown state?
        StatusText = sprintf("Controller is in unknown error state %s on network %s",MasterState,CurrentNetwork);
        break;
    
    }
  }
  
  return StatusText;
}

//-----------

function UpdateMasterInfo(ArrayWithInfo)
{
  var MasterStateInfo = ArrayWithInfo[0].split("\x1F");
  var MasterState     = parseInt(MasterStateInfo[0]); // master state
  var CurrentNetwork  = parseInt(MasterStateInfo[1]) + 1; // current network (1-4 based)
  
  var MasterStateText = GetGlobalMasterStateText(MasterState,CurrentNetwork);
  SetInnerHtmlValue("MasterState",MasterStateText);
}


function InitializeJavascriptMaster()
{
  SetEnabledFields(1);
  SetEnabledFields(2);
  SetEnabledFields(3);
  SetEnabledFields(4);
  
  var ProfitraceLicense = Math.min(4,4);
  
  for(var NetworkNumber=1; NetworkNumber<=4; NetworkNumber++){
    var CheckboxId = sprintf("Enabled-C%s",NetworkNumber);
    var WarningId  = sprintf("NotEnabled-C%s",NetworkNumber);
    
    var AllowConfiguration = (NetworkNumber <= ProfitraceLicense);    
    SetVisibility(CheckboxId,AllowConfiguration,"inline");
    SetVisibility(WarningId,!AllowConfiguration,"inline");
        
    if (!AllowConfiguration){
      // if configuration not allowed: disable some things
      SetCheckBoxValue(CheckboxId,false);
      SetEnabledFields(NetworkNumber);
    }
  }
}

//-----------

function UpdateWarnings(network)
{
  var EnabledNetworks = [];
  if (parseInt(GetCheckBoxValue ('Enabled-C'+network , "0")) != 0){
    EnabledNetworks.push(network);
  }  
   
  var EnabledNetworkMessage = sprintf("A Profibus controller will go online on the following network(s): %s.",EnabledNetworks.join(", "));
  SetInnerHtmlValue("user-confirm-enabled-networks",EnabledNetworkMessage);
  
  return EnabledNetworks.length;
}

//-----------


function ShowSaveBoxModal(network)
{
  var NetworkCount = UpdateWarnings(network);
  
  if (NetworkCount == 0){
    SaveSettingsConfirmed(network);
    return;
  }
  
  SetCheckBoxValue("user-confirm-checkbox",false);
  SetVisibility("SaveMasterSettingsModalBox",true);
  document.getElementById("confirmed-save-button").setAttribute("onclick","SaveSettingsConfirmed("+network+");");
}

//-----------

function HideSaveBoxModal()
{
  SetVisibility("SaveMasterSettingsModalBox",false);
}

//-----------

function SaveSettingsConfirmed(network)
{  
  var EnabledNetworks = [];
  if (parseInt(GetCheckBoxValue ('Enabled-C'+network , "0")) != 0){
    EnabledNetworks.push(network);
  }  
  
  if ((parseInt(GetCheckBoxValue ('user-confirm-checkbox' , "0")) == 0) && (EnabledNetworks.length > 0)){
    alert("Please confirm you understand the risk of saving these settings.");
    return;
  }
  
  HideSaveBoxModal();
  
  var args = [];

  var Enabled  = parseInt(GetCheckBoxValue ('Enabled-C'    + network , "0"));
  var Baudrate = parseInt(GetSelectBoxValue('Baudrate-C'   + network , "" ));
  var Address  = parseInt(GetTextValue     ('Address-C'    + network , "" ));
  var TSlot    = parseInt(GetTextValue     ('TSlot-C'      + network , "" ));
  var Mintsdr  = parseInt(GetTextValue     ('Mintsdr-C'    + network , "" ));
  var Maxtsdr  = parseInt(GetTextValue     ('Maxtsdr-C'    + network , "" ));
  var TSetup   = parseInt(GetTextValue     ('TSetup-C'     + network , "" ));
  var TQuiet   = parseInt(GetTextValue     ('TQuiet-C'     + network , "" ));
  var Hsa      = parseInt(GetTextValue     ('Hsa-C'        + network , "" ));
  var Retries  = parseInt(GetTextValue     ('Retries-C'    + network , "" ));
  var Ttr      = parseInt(GetTextValue     ('Ttr-C'        + network , "" ));
  var Gap      = parseInt(GetTextValue     ('Gap-C'        + network , "" ));
          
  // check parameter limits
  
  if (CheckNumber(Baudrate,0,9) != 0){
    alert("Error: The BAUD RATE is invalid.");
    return;
  }

  if (CheckNumber(Address,0,126) != 0){
    alert(sprintf("Error: The CONTROLLER ADDRESS must be a value between 0 and 126. (Network %s)",network));
    return;
  }

  if (CheckNumber(TSlot,52,65535) != 0){
    alert(sprintf("Error: The SLOT TIME must be a value between 52 and 65535. (Network %s)",network));
    return;
  }
  
  if (CheckNumber(Mintsdr,11,65535) != 0){
    alert(sprintf("Error: The MIN. STATION DELAY must be a value between 11 and 65535. (Network %s)",network));
    return;
  }
  
  if (CheckNumber(Maxtsdr,11,65535) != 0){
    alert(sprintf("Error: The MAX. STATION DELAY must be a value between 11 and 65535. (Network %s)",network));
    return;
  }
  
  if (CheckNumber(TSetup,1,255) != 0){
    alert(sprintf("Error: The SETUP TIME must be a value between 1 and 255. (Network %s)",network));
    return;
  }
  
  if (CheckNumber(TQuiet,0,255) != 0){
    alert(sprintf("Error: The QUIET TIME must be a value between 0 and 255. (Network %s)",network));
    return;
  }
  
  if (CheckNumber(Hsa,2,126) != 0){
    alert(sprintf("Error: The HIGHEST STATION ADDRESS must be a value between 2 and 126. (Network %s)",network));
    return;
  }
  
  if (CheckNumber(Retries,0,8) != 0){
    alert(sprintf("Error: The RETRY LIMIT must be a value between 0 and 8. (Network %s)",network));
    return;
  }
  
  if (CheckNumber(Ttr,1,16777215) != 0){
    alert(sprintf("Error: The TARGET ROTATION TIME must be a value between 1 and 16777215. (Network %s)",network));
    return;
  }
  
  if (CheckNumber(Gap,1,100) != 0){
    alert(sprintf("Error: The GAP UPDATE FACTOR must be a value between 1 and 100. (Network %s)",network));
    return;
  }
  
  // check parameter dependencies

  if (Address >= Hsa){
    alert(sprintf("Error: The CONTROLLER ADDRESS must have a lower value than HIGHEST STATION ADDRESS. (Network %s)",network));
    return;
  }

  if (TSlot <= Mintsdr){
    alert(sprintf("Error: The SLOT TIME must have a higher value than MIN. STATION DELAY. (Network %s)",network));
    return;
  }

  if (TSlot <= Maxtsdr){
    alert(sprintf("Error: The SLOT TIME must have a higher value than MAX. STATION DELAY. (Network %s)",network));
    return;
  }
  
  if (Mintsdr >= Maxtsdr){
    alert(sprintf("Error: The MIN. STATION DELAY must have a lower value than MAX. STATION DELAY. (Network %s)",network));
    return;
  }

  if (TQuiet >= Mintsdr){
    alert(sprintf("Error: The QUIET TIME must have a lower value than MIN. STATION DELAY. (Network %s)",network));
    return;
  }
  
  // add parameters to array
  
  args.push("setting_HubRead-Enabled-C"+network+":"+Enabled);
  args.push("setting_Master-Baudrate-C"+network+":"+Baudrate);
  args.push("setting_Master-Address-C" +network+":"+Address);
  args.push("setting_Master-TSlot-C"   +network+":"+TSlot);
  args.push("setting_Master-Mintsdr-C" +network+":"+Mintsdr);
  args.push("setting_Master-Maxtsdr-C" +network+":"+Maxtsdr);
  args.push("setting_Master-TSetup-C"  +network+":"+TSetup);
  args.push("setting_Master-TQuiet-C"  +network+":"+TQuiet);
  args.push("setting_Master-Hsa-C"     +network+":"+Hsa);
  args.push("setting_Master-Retries-C" +network+":"+Retries);
  args.push("setting_Master-Ttr-C"     +network+":"+Ttr);
  args.push("setting_Master-Gap-C"     +network+":"+Gap);

  // save all parameters to head station
  
  SaveSegmentedSettingsCombined("data_srv.cgi",args,"save-settings",1);   
}

//-----------

function SetEnabledFields(NetworkNumber)
{
  var Enabled = parseInt(GetCheckBoxValue ('Enabled-C'    + NetworkNumber , "0"));
  
  SetEnabled("Baudrate-C"+NetworkNumber,Enabled);
  SetEnabled("Address-C" +NetworkNumber,Enabled);
  SetEnabled("TSlot-C"   +NetworkNumber,Enabled);
  SetEnabled("Mintsdr-C" +NetworkNumber,Enabled);
  SetEnabled("Maxtsdr-C" +NetworkNumber,Enabled);
  SetEnabled("TSetup-C"  +NetworkNumber,Enabled);
  SetEnabled("TQuiet-C"  +NetworkNumber,Enabled);
  SetEnabled("Hsa-C"     +NetworkNumber,Enabled);
  SetEnabled("Retries-C" +NetworkNumber,Enabled);
  SetEnabled("Ttr-C"     +NetworkNumber,Enabled);
  SetEnabled("Gap-C"     +NetworkNumber,Enabled);
  SetEnabled("AutodetectButton-C"+NetworkNumber,Enabled);
}

//-----------

function SetDefaultsForBaudrate(NetworkNumber)
{
  var BaudrateIndex = parseInt( GetSelectBoxValue('Baudrate-C'+NetworkNumber,"6") );  // 1.5 Mbps is default

  switch(BaudrateIndex){
    case 0: // 9k6
    case 1: // 19k2
    case 3: // 93K
    case 4: // 187k
      SetTextValue("Address-C" +NetworkNumber,0);
      SetTextValue("TSlot-C"   +NetworkNumber,100);
      SetTextValue("Mintsdr-C" +NetworkNumber,11);
      SetTextValue("Maxtsdr-C" +NetworkNumber,60);
      SetTextValue("TSetup-C"  +NetworkNumber,1);
      SetTextValue("TQuiet-C"  +NetworkNumber,0);
      SetTextValue("Hsa-C"     +NetworkNumber,126);
      SetTextValue("Retries-C" +NetworkNumber,1);
      SetTextValue("Ttr-C"     +NetworkNumber,20000);
      SetTextValue("Gap-C"     +NetworkNumber,1);
    break;
    case 2: // 45k45
      SetTextValue("Address-C" +NetworkNumber,0);
      SetTextValue("TSlot-C"   +NetworkNumber,640);
      SetTextValue("Mintsdr-C" +NetworkNumber,11);
      SetTextValue("Maxtsdr-C" +NetworkNumber,400);
      SetTextValue("TSetup-C"  +NetworkNumber,95);
      SetTextValue("TQuiet-C"  +NetworkNumber,0);
      SetTextValue("Hsa-C"     +NetworkNumber,126);
      SetTextValue("Retries-C" +NetworkNumber,1);
      SetTextValue("Ttr-C"     +NetworkNumber,20000);
      SetTextValue("Gap-C"     +NetworkNumber,10);
    break;
    case 5: // 500k
      SetTextValue("Address-C" +NetworkNumber,0);
      SetTextValue("TSlot-C"   +NetworkNumber,200);
      SetTextValue("Mintsdr-C" +NetworkNumber,11);
      SetTextValue("Maxtsdr-C" +NetworkNumber,100);
      SetTextValue("TSetup-C"  +NetworkNumber,1);
      SetTextValue("TQuiet-C"  +NetworkNumber,0);
      SetTextValue("Hsa-C"     +NetworkNumber,126);
      SetTextValue("Retries-C" +NetworkNumber,1);
      SetTextValue("Ttr-C"     +NetworkNumber,20000);
      SetTextValue("Gap-C"     +NetworkNumber,1);
    break;
    case 6: // 1.5m
      SetTextValue("Address-C" +NetworkNumber,0);
      SetTextValue("TSlot-C"   +NetworkNumber,300);
      SetTextValue("Mintsdr-C" +NetworkNumber,11);
      SetTextValue("Maxtsdr-C" +NetworkNumber,150);
      SetTextValue("TSetup-C"  +NetworkNumber,1);
      SetTextValue("TQuiet-C"  +NetworkNumber,0);
      SetTextValue("Hsa-C"     +NetworkNumber,126);
      SetTextValue("Retries-C" +NetworkNumber,1);
      SetTextValue("Ttr-C"     +NetworkNumber,20000);
      SetTextValue("Gap-C"     +NetworkNumber,10);
    break;
    case 7: // 3m
      SetTextValue("Address-C" +NetworkNumber,0);
      SetTextValue("TSlot-C"   +NetworkNumber,400);
      SetTextValue("Mintsdr-C" +NetworkNumber,11);
      SetTextValue("Maxtsdr-C" +NetworkNumber,250);
      SetTextValue("TSetup-C"  +NetworkNumber,4);
      SetTextValue("TQuiet-C"  +NetworkNumber,3);
      SetTextValue("Hsa-C"     +NetworkNumber,126);
      SetTextValue("Retries-C" +NetworkNumber,2);
      SetTextValue("Ttr-C"     +NetworkNumber,20000);
      SetTextValue("Gap-C"     +NetworkNumber,10);
    break;
    case 8: // 6m
      SetTextValue("Address-C" +NetworkNumber,0);
      SetTextValue("TSlot-C"   +NetworkNumber,600);
      SetTextValue("Mintsdr-C" +NetworkNumber,11);
      SetTextValue("Maxtsdr-C" +NetworkNumber,450);
      SetTextValue("TSetup-C"  +NetworkNumber,8);
      SetTextValue("TQuiet-C"  +NetworkNumber,6);
      SetTextValue("Hsa-C"     +NetworkNumber,126);
      SetTextValue("Retries-C" +NetworkNumber,3);
      SetTextValue("Ttr-C"     +NetworkNumber,20000);
      SetTextValue("Gap-C"     +NetworkNumber,10);
    break;
    case 9: // 12m
      SetTextValue("Address-C" +NetworkNumber,0);
      SetTextValue("TSlot-C"   +NetworkNumber,1000);
      SetTextValue("Mintsdr-C" +NetworkNumber,11);
      SetTextValue("Maxtsdr-C" +NetworkNumber,800);
      SetTextValue("TSetup-C"  +NetworkNumber,16);
      SetTextValue("TQuiet-C"  +NetworkNumber,9);
      SetTextValue("Hsa-C"     +NetworkNumber,126);
      SetTextValue("Retries-C" +NetworkNumber,4);
      SetTextValue("Ttr-C"     +NetworkNumber,20000);
      SetTextValue("Gap-C"     +NetworkNumber,10);
    break;
  }
}


var xmlhttpAutodetect = null;
var AutodetectNetworkNumber = -1;

function onTimeoutAutodetect()
{
  xmlhttpAutodetect.onreadystatechange = function() {}
  xmlhttpAutodetect.abort();
  
  SetAutodetectBusy(AutodetectNetworkNumber,false);
  AutodetectNetworkNumber = -1;
  
  alert("Unable to detect the bus parameters: Browser timeout.");
}

//-----------

function onStateChangeAutodetect()
{
  if (xmlhttpAutodetect != null){
    if (xmlhttpAutodetect.readyState == 4){
      if (xmlhttpAutodetect.status == 200){

        var Response = decodeURIComponent(xmlhttpAutodetect.responseText);

        var ControlVars = [];
        ControlVars = Response.split("\x1D");

        var NetworkIndex = -1;
        var StatusInfo   = [];
        var Parameters   = [];

        if (ControlVars.length >= 2){
          NetworkIndex = parseInt(ControlVars[0]);
          var AdditionalInfo  = ControlVars[1].split("\x1E");
          if (AdditionalInfo.length >= 1) StatusInfo = AdditionalInfo[0].split("\x1F");
          if (AdditionalInfo.length >= 2) Parameters = AdditionalInfo[1].split("\x1F");
        }

        UpdateBusParameters(NetworkIndex,Parameters);
        SetAutodetectBusy(AutodetectNetworkNumber,false);
        
        if (StatusInfo.length >= 2){
          alert(StatusInfo[1]);
        }

        xmlhttpAutodetect.onreadystatechange = function() {}
        xmlhttpAutodetect.abort();
        AutodetectNetworkNumber = -1;
      }
    }
  }
}

//-----------

function SetAutodetectBusy(NetworkNumber,ShowAsBusy)
{
  SetVisibility("AutodetectButton-C"+NetworkNumber,!ShowAsBusy,"inline");
  SetVisibility("AutodetectSpinner-C"+NetworkNumber,ShowAsBusy,"inline");
  SetEnabled("ShowSaveBoxModal-C"  +NetworkNumber,!ShowAsBusy);
}

//-----------

function AutodetectParameters(NetworkNumber)
{
  if (AutodetectNetworkNumber >= 0){
    alert(sprintf("Unable to detect bus parameters: Another detection is currently in progress on network %s.",AutodetectNetworkNumber));
    return;
  }
  SetAutodetectBusy(NetworkNumber,true);  
  AutodetectNetworkNumber = NetworkNumber;
  
  var NetworkIndex = (NetworkNumber - 1);
  xmlhttpAutodetect = loadXMLDocASynch("data_srv.cgi", "return="+NetworkIndex+"&action=DetectMasterParameters:"+NetworkIndex, onStateChangeAutodetect, onTimeoutAutodetect,90000);
}

//-----------

function UpdateBusParameters(NetworkIndex,ParameterArray)
{
  if (ParameterArray.length == 0) return;
  if (isNaN(NetworkIndex) ) return;
  
  var DetectionResult = parseInt(ParameterArray[0]);
  
  if ((ParameterArray.length >= 8) && (DetectionResult == 0)){

    var NetworkNumber = (NetworkIndex + 1);
    var BaudRate = parseInt(ParameterArray[1]);
    
    SetSelectBoxValue("Baudrate-C"+NetworkNumber,BaudRate);
    SetDefaultsForBaudrate(NetworkNumber);

    var Address  = parseInt(ParameterArray[2]);
    var TSlot    = parseInt(ParameterArray[3]);
    var MaxTsdr  = parseInt(ParameterArray[4]);
    var TSetup   = parseInt(ParameterArray[5]);
    var TQuiet   = parseInt(ParameterArray[6]);
    var Hsa      = parseInt(ParameterArray[7]);
    
    SetTextValue("Address-C" +NetworkNumber,Address);
    SetTextValue("TSlot-C"   +NetworkNumber,TSlot);
    SetTextValue("Maxtsdr-C" +NetworkNumber,MaxTsdr);
    SetTextValue("TSetup-C"  +NetworkNumber,TSetup);
    SetTextValue("TQuiet-C"  +NetworkNumber,TQuiet);
    SetTextValue("Hsa-C"     +NetworkNumber,Hsa);
  } 
}