
window.onclick = function(event) 
{
	CheckMaintenanceEnableModalOnclick(event);
	CheckMaintenanceDisableModalOnclick(event);
} 

var TimerHandleData = null;

var xmlhttpStatusData = null;
var StatusDataTimeout = 0;

var xmlhttpSetTime = null;

var CurrentIpAddress  = "192.0.2.251";
var CurrentPortNumber = "80";

//-----------

function onTimeoutEventData()
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


        var IpAddress = "";
        var Netmask = "";
        var Gateway = "";
        var DnsAddress = "";
        var DhcpState = "DHCP 비활성화";
        var CurrentTime   = "";
        var WebCacheState = "";

        if (ControlVars.length >= 7){
          IpAddress    = ControlVars[0]; 
          Netmask      = ControlVars[1]; 
          Gateway      = ControlVars[2]; 
          DnsAddress   = ControlVars[3]; 
          if (parseInt(ControlVars[4]) != 0){
            DhcpState = "DHCP 활성화";
          }
          CurrentTime  = ControlVars[5];
          WebCacheState= ControlVars[6].split("\x1F");
        }

        SetInnerHtmlValue("current_ip",IpAddress);
        SetInnerHtmlValue("current_net",Netmask);
        SetInnerHtmlValue("current_gate",Gateway);
        SetInnerHtmlValue("current_dns",DnsAddress);
        SetInnerHtmlValue("current_dhcp",DhcpState);

        SetInnerHtmlValue("cb_time","ComBricks time: "+CurrentTime);
        SetInnerHtmlValue("pc_time","PC 시간: "+GetLocalPcTime(GetSelectBoxValue("time_format",0)) );
        
        WriteLanguageState(WebCacheState);

        onTimeoutEventData();
      }
    }
  }
}

//-----------

function WriteLanguageState(State)
{
  SetInnerHtmlValue("lang_status",State[1]);
  
  // check State[0] changed from 1 or 2 to 0
  var CurrentState = parseInt(State[0]);
  
  if (WriteLanguageState.PreviousState == undefined){
    // initialize the var for the first time
    WriteLanguageState.PreviousState = CurrentState;
  }
  
  if ((WriteLanguageState.PreviousState > 0) && (CurrentState == 0)){
    
    // this message is translated during the request below. Do not translate this item using [tt]-[/tt] tags!!!
    // "새로운 언어로 로딩되었습니다, 웹페이지를 새로이 로딩할까요?"; !leave this dummt text!
    var CurrentMessage = TranslateText("A new language is loaded, do you wish to reload the web page?"); 
    
    if (confirm(CurrentMessage) == true){
      parent.location.reload();      // reload page when done
    }
  }
  
  WriteLanguageState.PreviousState = CurrentState;
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

  var PropParams  = "property=ipaddr+netmask+gateway+dnsaddr+dhcpState+Time";
  var DataParams  = "data=WebCacheState";
  var TotalParams = PropParams + "&" + DataParams;

  xmlhttpStatusData = loadXMLDocASynch("data_srv.cgi",TotalParams, onStateChangeData,onTimeoutEventData);
  StatusDataTimeout = 10;
}

//-----------

function GetLocalPcTime(TimeFormat)
{
  var m_names = new Array("1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월");

  var currentTime = new Date();

  var cDate = currentTime.getDate().toString();
  var cMonth = m_names[currentTime.getMonth()];
  var cYear = currentTime.getFullYear().toString();

  var cHour = currentTime.getHours().toString();
  var cMinute = currentTime.getMinutes().toString();
  if (cMinute.length < 2) cMinute = "0" + cMinute;
  var cSecond = currentTime.getSeconds().toString();
  if (cSecond.length < 2) cSecond = "0" + cSecond;


  var PcDate = cDate + "-" + cMonth + "-" + cYear;
  var PcTime = cHour + ":" + cMinute + ":" + cSecond;

  if (TimeFormat == 1){
    var AmPm = "AM";
    if (cHour >= 12){
      AmPm = "PM";
      cHour -= 12;
    }
    if (cHour == 0) cHour = 12;
    PcTime = cHour + ":" + cMinute + ":" + cSecond + " " + AmPm;
  }

  return PcDate + " " + PcTime;
}

//-----------

function CheckIpFieldsState()
{
  var EnableControls = true;
  if (GetCheckBoxValue('ip_dhcp',0) != 0) EnableControls = false;

  SetEnabled("ip_address",EnableControls);
  SetEnabled("net_address",EnableControls);
  SetEnabled("gate_address",EnableControls);
  SetEnabled("dns_address",EnableControls);
}

//-----------

function InitializeJavascript()
{
  //set globals
  StatusDataTimeout = 0;

  // start the timer(s)
  PeriodicTimerUpdateStatusData();

  var AutoRefreshInterval = 1 * 1000;
  if (AutoRefreshInterval < 1000) AutoRefreshInterval = 1000;
  TimerHandleData = setInterval('PeriodicTimerUpdateStatusData()',AutoRefreshInterval);

	SetSelectBoxValue("time_zone",'9.0');
	SetSelectBoxValue("time_format",'0');

	var CurrentTime = decodeURIComponent('2026986483');
	var TimeFields = [];
	TimeFields = CurrentTime.split("\x1F");
	if (TimeFields.length >= 6){
	  SetTextValue("time_year"  ,TimeFields[0]);
	  SetTextValue("time_month" ,TimeFields[1]);
	  SetTextValue("time_dom"   ,TimeFields[2]);
	  SetTextValue("time_hour"  ,TimeFields[3]);
	  SetTextValue("time_minute",TimeFields[4]);
	  SetTextValue("time_second",TimeFields[5]);
	}

	SetEnabledNtpFields();
	CheckIpFieldsState();
}

//-----------

function SynchronizeTimeNow()
{
  var currentTime = new Date();

  var VarDate = currentTime.getFullYear();
  VarDate <<= 8;
  VarDate |= (currentTime.getMonth()+1);
  VarDate <<= 8;
  VarDate |= currentTime.getDate();

  var VarTime = currentTime.getDay(); // dow
  VarTime <<= 8;
  VarTime |= currentTime.getHours();
  VarTime <<= 8;
  VarTime |= currentTime.getMinutes();
  VarTime <<= 8;
  VarTime |= currentTime.getSeconds();

  var ActionParams = "action=SetTime:"+VarDate+":"+VarTime;

  xmlhttpSetTime = loadXMLDocASynch("data_srv.cgi", ActionParams, onStateChangeTimeSync, onTimeoutTimeSync);
}

//-----------

function SetTimeNow()
{
  var ValueYear   = parseInt(GetTextValue("time_year",0)  ,10);
  var ValueMonth  = parseInt(GetTextValue("time_month",0) ,10);
  var ValueDay    = parseInt(GetTextValue("time_dom",0)   ,10);
  var ValueHour   = parseInt(GetTextValue("time_hour",0)  ,10);
  var ValueMinute = parseInt(GetTextValue("time_minute",0),10);
  var ValueSecond = parseInt(GetTextValue("time_second",0),10);

  if (CheckNumber(ValueYear,2010) != 0){
    alert("에러: 년도는 2010보다 같거나 커야 합니다.\n시간이 설정되지 않았습니다.");
    return;
  }

  if (CheckNumber(ValueMonth,1,12) != 0){
    alert("에러 : 월은 1에서 12 범위이어야 합니다.\n시간이 설정되지 않았습니다.");
    return;
  }

  if (CheckNumber(ValueDay,1,31) != 0){
    alert("에러: 날짜는 1에서 31 버위이어야 합니다 (월에 따라 다름).\n시간이 설정되지 않았습니다.");
    return;
  }

  if (CheckNumber(ValueHour,0,23) != 0){
    alert("에러: 시간은 0에서 23 범위이어야 합니다.\n시간이 설정되지 않았습니다.");
    return;
  }

  if (CheckNumber(ValueMinute,0,59) != 0){
    alert("에서: 분은 0에서 59 범위이어야 합니다.\n시간이 설정되지 않았습니다.");
    return;
  }

  if (CheckNumber(ValueSecond,0,59) != 0){
    alert("에러: 초는 0에서 59 범위이어야 합니다.\n시간이 설정되지 않았습니다.");
    return;
  }

  var VarDate = ValueYear;
  VarDate <<= 8;
  VarDate |= ValueMonth;
  VarDate <<= 8;
  VarDate |= ValueDay;

  var VarTime = 0; // DOW, not used!!
  VarTime <<= 8;
  VarTime |= ValueHour;
  VarTime <<= 8;
  VarTime |= ValueMinute;
  VarTime <<= 8;
  VarTime |= ValueSecond;

  var ActionParams = "action=SetTime:"+VarDate+":"+VarTime;

  xmlhttpSetTime = loadXMLDocASynch("data_srv.cgi", ActionParams, onStateChangeTimeSync, onTimeoutTimeSync);
}

//-----------

function onTimeoutTimeSync()
{
  xmlhttpSetTime.onreadystatechange = function() {}
  xmlhttpSetTime.abort();
}

//-----------

function onStateChangeTimeSync()
{
  if (xmlhttpSetTime != null){
    if (xmlhttpSetTime.readyState == 4){
      if (xmlhttpSetTime.status == 200){

        var Response = decodeURIComponent(xmlhttpSetTime.responseText);

        var Result_arr = [];
        Result_arr = Response.split('\x1F');
        if (Result_arr.length == 2){
    	    //Result_arr[0]
  	      alert(Result_arr[1]);
        }

        onTimeoutTimeSync();
      }
    }
  }
}


//-----------

function SaveSettings()
{
  var args = [];
  
  //-----------------generic config related fields save------------------

  args.push("setting_Time-Zone:"   + GetSelectBoxValue('time_zone',"0") );
  args.push("setting_Time-Format:" + GetSelectBoxValue('time_format',"0") );

  //--------------
  
  var NtpServer   = GetTextValue('ntp_server',"");
  var NtpInterval = parseInt(GetTextValue('ntp_interval',0));

  if (CheckString(NtpServer,250) != 0){
    alert("에러: NTP 서버는 250문자를 초과할 수 없습니다.");
    return;
  }
  
  if (CheckNumber(NtpInterval,1,1440) != 0){
    alert("에러: NTP 간격은 1에서 1440분 범위이어야 합니다.");
    return;
  }

  args.push("setting_Ntp-UseServer:" + GetCheckBoxValue('ntp_useserver',"0") );
  args.push("setting_Ntp-Server:"    + encodeURIComponent(NtpServer) );
  args.push("setting_Ntp-Interval:"  + NtpInterval);

  //--------------

  var CompanyName = GetTextValue('company_name',"");
  var CountryName = GetTextValue('country_name',"")
  var SiteName    = GetTextValue('site_name'   ,"")
  var DeviceName  = GetTextValue('device_name' ,"")
  var ContactName = GetTextValue('contact_name',"")

  if (CheckString(CompanyName,45) != 0){
    alert("에러: 공정이름은 45문자를 초과할 수 없습니다.");
    return;
  }
  if (CheckString(CountryName,35) != 0){
    alert("에러: 로봇이름은 35문자를 초과할 수 없습니다.");
    return;
  }
  if (CheckString(SiteName,35) != 0){
    alert("에러 : 공정명은 35문자를 초과할 수 없습니다.");
    return;
  }
  if (CheckString(DeviceName,35) != 0){
    alert("에러: 장치 이름은 35문자를 초과할 수 없습니다.");
    return;
  }
  if (CheckString(DeviceName,35,/^[A-Za-z0-9 \._]{0,35}$/) != 0){
    alert("에러: 장치이름이 유효하지 않은 문자를 포함하고 있습니다.\n 허용된 문자는: A-Z,0-9,dot,underscore,space 입니다.");
    return;
  }

  if (CheckString(ContactName,40) != 0){
    alert("에러: 연락처는 40문자를 초과할 수 없습니다.");
    return;
  }

  args.push("setting_Company-Name:"  + encodeURIComponent(CompanyName) );
  args.push("setting_Country-Name:"  + encodeURIComponent(CountryName) );
  args.push("setting_Site-Name:"     + encodeURIComponent(SiteName   ) );
  args.push("setting_Device-Name:"   + encodeURIComponent(DeviceName ) );
  args.push("setting_Contact-Name:"  + encodeURIComponent(ContactName) );

  //--------------

  var RefreshValue      = parseInt(GetTextValue('disp_refresh_interval',"1"));
  var StartPageValue    = parseInt(GetSelectBoxValue('start_page',"0"));
  var StartNetworkValue = parseInt(GetSelectBoxValue('start_network',"0"));

  if (CheckNumber(RefreshValue,1,60) != 0){
    alert("에러: 업데이트 간격은 1에서 60초 범위이어야 합니다.");
    return;
  }

  args.push("setting_Disp-RefreshInterval:"  + RefreshValue      );
  args.push("setting_Web-StartPage:"         + StartPageValue    );
  args.push("setting_Web-StartNetwork:"      + StartNetworkValue );
  

  //--------------

  var LogSaveInterval = parseInt(GetTextValue('log_save_interval',"1"));

  if (CheckNumber(LogSaveInterval,1,9999) != 0){
    alert("에러: 기록저장 간격은 1에서 9999분 범위이어야 합니다.");
    return;
  }

  args.push("setting_Log-SaveInterval:"      + LogSaveInterval );

  //--------------
  
  var SelectedLanguage = GetSelectBoxValue('cb_language',"eng");

  args.push("setting_PrefLanguage:"      + SelectedLanguage );

  //--------------ip related fields save---------------------
  
  var IpAddressesChanged = 0;

  var OriginalDhcp = parseInt("0");
  var NewDhcp = GetCheckBoxValue('ip_dhcp',0);
  if (OriginalDhcp != NewDhcp){
    args.push("setting_IP-DHCP:" + NewDhcp);
    IpAddressesChanged++;
  }

  if (NewDhcp == 0){  // DHCP is not enabled
    
    var OriginalIpAddress = "192.0.2.251";
    var NewIpAddress = document.getElementById('ip_address').value;
    if (NewIpAddress != OriginalIpAddress){
      args.push("setting_IP-Address:" + encodeURIComponent(NewIpAddress));
      IpAddressesChanged++;
    }
    if (CheckIpAddress(NewIpAddress) != 0){
      alert("에러: IP주소가 유효하지 않습니다.");
      return;
    }

    var OriginalNetmask = "255.255.255.0";
    var NewNetmask = document.getElementById('net_address').value;
    if (NewNetmask != OriginalNetmask){
      args.push("setting_IP-NetMask:" + encodeURIComponent(NewNetmask));
      IpAddressesChanged++;
    }
    if (CheckIpAddress(NewNetmask,true) != 0){
      alert("에러: 넷마스크 내용이 유효하지 않은 값입니다.");
      return;
    }
  
    var OriginalGateway = "172.27.125.1";
    var NewGateway = document.getElementById('gate_address').value;
    if (NewGateway != OriginalGateway){
      args.push("setting_IP-Gateway:" + encodeURIComponent(NewGateway));
      IpAddressesChanged++;
    }
    if (CheckIpAddress(NewGateway) != 0){
      alert("에러: 기본 게이트웨이의 IP주소가 유효하지 않습니다.");
      return;
    }

    var NewDns = document.getElementById('dns_address').value;
    args.push("setting_IP-Dns:" + encodeURIComponent(NewDns) );
    if (CheckIpAddress(NewDns) != 0){
      alert("에러: DNS 서버가 유효하지 않은 IP주소입니다.");
      return;
    }
  }

  var NewLink = document.getElementById('return_link').value;
  if (CheckString(NewLink,100) != 0){
    alert("에러: 알림링크는 100문자를 초과할 수 없습니다.");
    return;
  }

  args.push("setting_Return-Link:" + encodeURIComponent(NewLink) );

	//--------------------------------action related checks-----------------------

  var act = "save-settings+save-translate";
  if (IpAddressesChanged != 0){
    act = act + "+apply-ipconfig";
    if (confirm("IP 설정을 변경함으로써 이 웹사이트가 연결되지 않을 수 있습니다.\n IP설정을 전환하시겠습니까?") == false) return;
  }

  var SaveResult = SaveSegmentedSettingsCombined("data_srv.cgi",args,act,1);

  if ((SaveResult.Code == 200) && (OriginalIpAddress != NewIpAddress)){
    CurrentIpAddress = NewIpAddress;
    AskToNavigateToNewLocation();
  }
}


//-----------

function AskToNavigateToNewLocation()
{
  if (confirm("The IP-address and/or port number have changed.\nDo you wish to try to navigate to this new location?\n\n(이것은 로컬 네트워크에서만 작동합니다.)") == true){
    parent.location = "http://"+CurrentIpAddress+":"+CurrentPortNumber+"/";
  }
}

//-----------

function SetEnabledNtpFields()
{
  var Enablentp = GetCheckBoxValue('ntp_useserver',1);
  SetEnabled('ntp_interval',(Enablentp != 0));
  SetEnabled('ntp_server',(Enablentp != 0));
}

//-------------------------server & port related functions-------------------------


var xmlhttpChangePort = null;


function onStateChangePort()
{
  if (xmlhttpChangePort != null){
    if (xmlhttpChangePort.readyState == 4){
      if (xmlhttpChangePort.status == 200){

        var Response = decodeURIComponent(xmlhttpChangePort.responseText);

        var Result = [];
        Result = Response.split('\x1D');
        var Message = [];
        if (Result.length == 3){
          Message = Result[0].split('\x1F');
        }
        if (Message.length == 2){
  	      alert(Message[1]);
        }
        
        onTimeoutChangePort();
    
        if ((Result[2] == "Web") && (Message[0] == 200)){
          CurrentPortNumber = Result[1];
          AskToNavigateToNewLocation();
        }
      }
    }
  }
}

//-----------

function onTimeoutChangePort()
{
  xmlhttpChangePort.onreadystatechange = function() {}
  xmlhttpChangePort.abort();
}

//-----------

function ApplyCommDtmServerChange()
{
  var NewPort = document.getElementById('port_commdtm').value;
  var NewEnable = document.getElementById('enable_commdtm').checked ? 1 : 0;

  if (CheckNumber(NewPort,1024,65535) != 0){
    alert("Error: The CommDTM Server port must be a number between 1024 and 65535.");
    return;
  }

  xmlhttpChangePort = loadXMLDocASynch("data_srv.cgi","action=ChangeCommDtmServer:"+NewPort+":"+NewEnable+"&return="+NewPort+"+CommDTM",onStateChangePort,onTimeoutChangePort);
}

//-----------

function ApplyStreamingServerChange()
{
  var NewPort = document.getElementById('port_streaming').value;
  var NewEnable = document.getElementById('enable_streaming').checked ? 1 : 0;
  
  if (CheckNumber(NewPort,1024,65535) != 0){
    alert("Error: The Streaming Server port must be a number between 1024 and 65535.");
    return;
  }
  
  xmlhttpChangePort = loadXMLDocASynch("data_srv.cgi","action=ChangeStreamingServer:"+NewPort+":"+NewEnable+"&return="+NewPort+"+Streaming",onStateChangePort,onTimeoutChangePort);
}

//-----------

function ApplyHttpServerChange()
{
  var NewPort = document.getElementById('port_http').value;

  if ((CheckNumber(NewPort,1024,65535) != 0) && (NewPort != 80)){
    alert("Error: The Web Server port must be a number between 1024 and 65535 or the default value of 80.");
    return;
  }

  if (confirm("Changing the Web Server port may cause this website to become unreachable.\n Are you sure you want to change the port?") == false) return;

  xmlhttpChangePort = loadXMLDocASynch("data_srv.cgi","action=ChangeHttpServer:"+NewPort+"&return="+NewPort+"+Web",onStateChangePort,onTimeoutChangePort);
}



function ApplyUpdateServerChange()
{
  var NewPort = document.getElementById('port_update').value;
  var NewEnable = document.getElementById('enable_update').checked ? 1 : 0;

  if (CheckNumber(NewPort,1024,65535) != 0){
    alert("Error: The Remote update Server port must be a number between 1024 and 65535.");
    return;
  }

  xmlhttpChangePort = loadXMLDocASynch("data_srv.cgi","action=ChangeUpdateServer:"+NewPort+":"+NewEnable+"&return="+NewPort+"+Update",onStateChangePort,onTimeoutChangePort);
}


function ApplyFtpServerChange()
{
  var NewPort = document.getElementById('port_ftp').value;
  var NewEnable = document.getElementById('enable_ftp').checked ? 1 : 0;

  if ((CheckNumber(NewPort,1024,65535) != 0) && (NewPort != 21)){
    alert("Error: The FTP Server port must be a number between 1024 and 65535 or the default value of 21.");
    return;
  }

  xmlhttpChangePort = loadXMLDocASynch("data_srv.cgi","action=ChangeFtpServer:"+NewPort+":"+NewEnable+"&return="+NewPort+"+Ftp",onStateChangePort,onTimeoutChangePort);
}


function ApplyTelnetServerChange()
{
  var NewPort = document.getElementById('port_telnet').value;
  var NewEnable = document.getElementById('enable_telnet').checked ? 1 : 0;

  if ((CheckNumber(NewPort,1024,65535) != 0) && (NewPort != 23)){
    alert("Error: The Telnet Server port must be a number between 1024 and 65535 or the default value of 23.");
    return;
  }

  xmlhttpChangePort = loadXMLDocASynch("data_srv.cgi","action=ChangeTelnetServer:"+NewPort+":"+NewEnable+"&return="+NewPort+"+Telnet",onStateChangePort,onTimeoutChangePort);
}