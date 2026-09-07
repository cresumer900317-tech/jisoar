
window.onclick = function(event) 
{
	CheckMaintenanceEnableModalOnclick(event);
	CheckMaintenanceDisableModalOnclick(event);
} 

var xmlhttpActions;

//-----------

function InitializeJavascript()
{
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
  	      alert(Result_arr[1]);
        }

        onTimeoutActions();
      }
    }
  }
}

//-----------

function BackupSettings()
{
  if (confirm("모든 설정을 SD 카드에 백업 하시겠습니까?") != 0){
    xmlhttpActions = loadXMLDocASynch("data_srv.cgi", "action=BackupSettings", onStateChangeActions,onTimeoutActions);
  }
}

//-----------

function RestoreSettings()
{
  var ReturnValue = [];
  var Result = "";
  
  if (confirm("SD카드로부터의 모든 설정을 복구하시겠습니까?") != 0){
    
    // get old ip in settings
    var OriginalIpAddress = decodeURIComponent(loadXMLDocSynch("data_srv.cgi", "action=getset:IP-Address"));
    
    // restore settings
    Result = decodeURIComponent(loadXMLDocSynch("data_srv.cgi", "action=RestoreSettings"));
    ReturnValue = Result.split("\x1f");
    if (ReturnValue.length != 2) return;
    if (parseInt(ReturnValue[0]) != 200){
      alert(ReturnValue[1]);
      return;
    }
    
    // get new ip in settings
    var NewIpAddress = decodeURIComponent(loadXMLDocSynch("data_srv.cgi", "action=getset:IP-Address"));
    
    // restore ip
    Result = decodeURIComponent(loadXMLDocSynch("data_srv.cgi", "action=apply-ipconfig"));
    ReturnValue = Result.split("\x1f");
    if (ReturnValue.length != 2) return;
    if (parseInt(ReturnValue[0]) != 200){
      alert(ReturnValue[1]);
      return;
    }
    
    if (OriginalIpAddress != NewIpAddress){
      if (confirm(sprintf("IP주소가 %s로 변경되었습니다\n새로운 IP주소를 찾으시겠습니까?\n(이것은 로컬 네트워크에서만 작동합니다.)",NewIpAddress)) == true){
        parent.location = "http://"+NewIpAddress+"/";
      }
    }
    
  }
}

//-----------

function ResetSettings()
{
  if (confirm("모든 설정을 초기화 하시겠습니까 ?") != 0){
    xmlhttpActions = loadXMLDocASynch("data_srv.cgi", "action=ResetToDefaults", onStateChangeActions, onTimeoutActions);
  }
}

//-----------

function ClearAllData()
{
  if (confirm("수집된 모든 정보를 지우시겠습니까?") != 0){
    xmlhttpActions = loadXMLDocASynch("data_srv.cgi", "action=ClearAllData", onStateChangeActions, onTimeoutActions);
  }
}

//-----------

function RestartDevice()
{
  if (confirm("통신이 일시 단절되게 됩니다. 정말로 장치를 재부팅 하시겠습니까?") != 0){
    xmlhttpActions = loadXMLDocASynch("data_srv.cgi", "action=warm-restart", onStateChangeActions, onTimeoutActions);
  }
}

//-----------

