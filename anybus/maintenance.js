//--------------------Show current status of maintenance mode-------------------

var xmlhttpMaintenanceStatus = null;
var TimerHandleMaintenanceStatus = null;

//-----------

function onTimeoutMaintenanceStatus()
{
  xmlhttpMaintenanceStatus.onreadystatechange = function() {}
  xmlhttpMaintenanceStatus.abort();
}

//-----------

var MaintenanceNetworks = 0;

function onStateChangeMaintenanceStatus()
{
  if (xmlhttpMaintenanceStatus != null){
    if (xmlhttpMaintenanceStatus.readyState == 4){
      if (xmlhttpMaintenanceStatus.status == 200){
  
        var Response = decodeURIComponent(xmlhttpMaintenanceStatus.responseText);
        
        var ResponseArray = Response.split("\x1d");
        
        var MaintenanceEnabled = 0;
        var MaintenanceText = "";
        
        if (ResponseArray.length >= 2){
        	MaintenanceEnabled = parseInt(ResponseArray[0]);
        	MaintenanceText    = ResponseArray[1];
        }
        
        onTimeoutMaintenanceStatus();
        
        SetVisibility("maintenance-box",MaintenanceEnabled != 0,"block");
        SetInnerHtmlValue("maintenance-message",MaintenanceText);
        
        MaintenanceNetworks = MaintenanceEnabled;
      }
    }
  }
}

//-----------

function MaintenanceUpdateStatus()
{
	xmlhttpMaintenanceStatus = loadXMLDocASynch("data_srv.cgi", "property=Maintenance-Enabled+Maintenance-Text", onStateChangeMaintenanceStatus, onTimeoutMaintenanceStatus);
}

//-----------

function InitializeMaintenanceMode()
{
	SetVisibility("maintenance-box",0 != 0,"block");
	TimerHandleMaintenanceStatus = setInterval('MaintenanceUpdateStatus()',5000);
}

//---------------------Enable maintenance mode for networks---------------------

function ShowEnableMaintenanceDialog()
{
	SetVisibility('SectionEnableMaintenanceNetwork1',(MaintenanceNetworks & 1) == 0);
	SetVisibility('SectionEnableMaintenanceNetwork2',(MaintenanceNetworks & 2) == 0);
	SetVisibility('SectionEnableMaintenanceNetwork3',(MaintenanceNetworks & 4) == 0);
	SetVisibility('SectionEnableMaintenanceNetwork4',(MaintenanceNetworks & 8) == 0);
	SetCheckBoxValue('CheckboxEnableMaintenanceNetwork1',false);
	SetCheckBoxValue('CheckboxEnableMaintenanceNetwork2',false);
	SetCheckBoxValue('CheckboxEnableMaintenanceNetwork3',false);
	SetCheckBoxValue('CheckboxEnableMaintenanceNetwork4',false);
	CheckEnableButtonEnabled();
	SetVisibility("EnableMaintenanceModal",true);	
}

//-----------

function HideEnableMaintenanceDialog()
{
	SetVisibility("EnableMaintenanceModal",false);	
}

//-----------

function CheckMaintenanceEnableModalOnclick(event) 
{
  if (event.target == document.getElementById("EnableMaintenanceModal")) {
    HideEnableMaintenanceDialog();
  }
} 

var xmlhttpMaintenanceEnable = null;

//-----------

function onTimeoutMaintenanceEnable()
{
  xmlhttpMaintenanceEnable.onreadystatechange = function() {}
  xmlhttpMaintenanceEnable.abort();
}

//-----------

function onStateChangeMaintenanceEnable()
{
  if (xmlhttpMaintenanceEnable != null){
    if (xmlhttpMaintenanceEnable.readyState == 4){
      if (xmlhttpMaintenanceEnable.status == 200){
  
        var Response = decodeURIComponent(xmlhttpMaintenanceEnable.responseText);
        
        var Result_arr = [];
        Result_arr = Response.split('\x1F');
        if (Result_arr.length == 2){
        	if (parseInt(Result_arr[0]) != 200){
  	      	alert(Result_arr[1]);
  	      }
        }
        
        onTimeoutMaintenanceEnable();
        MaintenanceUpdateStatus();
      }
    }
  }
}

//-----------

function EnableMaintenanceMode(Network1,Network2,Network3,Network4)
{
	var EnabledBits = 0;
	if (Network1 == true) EnabledBits |= 0x01;
	if (Network2 == true) EnabledBits |= 0x02;
	if (Network3 == true) EnabledBits |= 0x04;
	if (Network4 == true) EnabledBits |= 0x08;
	xmlhttpMaintenanceEnable = loadXMLDocASynch("data_srv.cgi", "action=EnableMaintenanceMode:"+EnabledBits, onStateChangeMaintenanceEnable, onTimeoutMaintenanceEnable);
	HideEnableMaintenanceDialog();
}

//-----------

function CheckEnableButtonEnabled()
{
	var NewEnabledNetworks = false;
	for(var i=1; i<=4; i++){
		var checked = GetCheckBoxValue('CheckboxEnableMaintenanceNetwork'+i,0) != 0;
		var visible = GetVisibility('CheckboxEnableMaintenanceNetwork'+i,0) != 0;
		if (visible && checked) NewEnabledNetworks = true;
	}
	
	SetEnabled("EnableMaintenanceButton",NewEnabledNetworks);
}

//--------------------Disable maintenance mode for networks---------------------


function ShowDisableMaintenanceDialog()
{
	SetVisibility('SectionDisableMaintenanceNetwork1',(MaintenanceNetworks & 1) != 0);
	SetVisibility('SectionDisableMaintenanceNetwork2',(MaintenanceNetworks & 2) != 0);
	SetVisibility('SectionDisableMaintenanceNetwork3',(MaintenanceNetworks & 4) != 0);
	SetVisibility('SectionDisableMaintenanceNetwork4',(MaintenanceNetworks & 8) != 0);
	SetCheckBoxValue('CheckboxDisableMaintenanceNetwork1',false);
	SetCheckBoxValue('CheckboxDisableMaintenanceNetwork2',false);
	SetCheckBoxValue('CheckboxDisableMaintenanceNetwork3',false);
	SetCheckBoxValue('CheckboxDisableMaintenanceNetwork4',false);
	CheckDisableButtonEnabled();
	SetVisibility("DisableMaintenanceModal",true);	
}

//-----------

function HideDisableMaintenanceDialog()
{
	SetVisibility("DisableMaintenanceModal",false);	
}

//-----------

function CheckMaintenanceDisableModalOnclick(event) 
{
  if (event.target == document.getElementById("DisableMaintenanceModal")) {
    HideDisableMaintenanceDialog();
  }
} 

var xmlhttpMaintenanceDisable = null;

//-----------

function onTimeoutMaintenanceDisable()
{
  xmlhttpMaintenanceDisable.onreadystatechange = function() {}
  xmlhttpMaintenanceDisable.abort();
}

//-----------

function onStateChangeMaintenanceDisable()
{
  if (xmlhttpMaintenanceDisable != null){
    if (xmlhttpMaintenanceDisable.readyState == 4){
      if (xmlhttpMaintenanceDisable.status == 200){
  
        var Response = decodeURIComponent(xmlhttpMaintenanceDisable.responseText);
        
        var Result_arr = [];
        Result_arr = Response.split('\x1F');
        if (Result_arr.length == 2){
        	if (parseInt(Result_arr[0]) != 200){
  	      	alert(Result_arr[1]);
  	      }
        }
        
        onTimeoutMaintenanceDisable();   
        MaintenanceUpdateStatus();
      }
    }
  }
}

//-----------

function DisableMaintenanceMode(Network1,Network2,Network3,Network4)
{
	var DisabledBits = 0;
	if (Network1 == true) DisabledBits |= 0x01;
	if (Network2 == true) DisabledBits |= 0x02;
	if (Network3 == true) DisabledBits |= 0x04;
	if (Network4 == true) DisabledBits |= 0x08;
	xmlhttpMaintenanceDisable = loadXMLDocASynch("data_srv.cgi", "action=DisableMaintenanceMode:"+DisabledBits, onStateChangeMaintenanceDisable, onTimeoutMaintenanceDisable);
	HideDisableMaintenanceDialog();
}

//-----------

function CheckDisableButtonEnabled()
{
	var NewDisabledNetworks = false;
	for(var i=1; i<=4; i++){
		var checked = GetCheckBoxValue('CheckboxDisableMaintenanceNetwork'+i,0) != 0;
		var visible = GetVisibility('CheckboxDisableMaintenanceNetwork'+i,0) != 0;
		if (visible && checked) NewDisabledNetworks = true;
	}
	
	SetEnabled("DisableMaintenanceButton",NewDisabledNetworks);
}
