
window.onclick = function(event) 
{
	CheckMaintenanceEnableModalOnclick(event);
	CheckMaintenanceDisableModalOnclick(event);
} 

var xmlhttpTestEmail = null;
var EmailLicense = 0;
//-----------

function InitializeJavascript()
{
  var Warnings = [];

  EmailLicense = 1;

  if (EmailLicense == 0){
    Warnings = AddWarning(Warnings,"이메일을 위한 라이센스가 없습니다.");
  }

  DisplayWarnings(Warnings);

  //------------------------
 
  var PeriodicInterval = parseInt("24");
  SetTextValue("alive_email_interval_days", parseInt(PeriodicInterval / 24));
  SetTextValue("alive_email_interval_hours",parseInt(PeriodicInterval % 24));
  
  SetEnabledUserNamePass();
  SetEnabledAliveEmail();
}

//-----------

var LastSavedTo         = "";
var LastSavedTo2        = "";
var LastSavedTo3        = "";
var LastSavedTo4        = "";
var LastSavedCc         = "";
var LastSavedFrom       = "";
var LastSavedSubject    = "";
var LastSavedServer     = "";
var LastSavedServerPort = "25";
var LastSavedUserReq    = parseInt("0",0);
var LastSavedUserName   = "";
var LastSavedPassword   = "";

//-----------

function AreSettingsChanged()
{
  var ToAddress     = document.getElementById('to_address').value;
  var ToAddress2    = document.getElementById('to_address2').value;
  var ToAddress3    = document.getElementById('to_address3').value;
  var ToAddress4    = document.getElementById('to_address4').value;
  var CcAddress     = document.getElementById("cc_address").value;
  var FromAddress   = document.getElementById("from_address").value;
  var Subject       = document.getElementById("subject").value;
  var SmtpServer    = document.getElementById("smtp_address").value;
  var SmtpPort      = document.getElementById("smtp_port").value;
  var EmailUserReq  = GetCheckBoxValue("smtp_requires_name_pass",0);  
  var EmailUsername = document.getElementById("smtp_user").value;
  var EmailPassword = document.getElementById("smtp_pass").value;

//-----------

  var ChangedItems = 0;
  
  if (LastSavedTo         != ToAddress    ) ChangedItems++;
  if (LastSavedTo2        != ToAddress2   ) ChangedItems++;
  if (LastSavedTo3        != ToAddress3   ) ChangedItems++;
  if (LastSavedTo4        != ToAddress4   ) ChangedItems++;
  if (LastSavedCc         != CcAddress    ) ChangedItems++;
  if (LastSavedFrom       != FromAddress  ) ChangedItems++;
  if (LastSavedSubject    != Subject      ) ChangedItems++;
  if (LastSavedServer     != SmtpServer   ) ChangedItems++;
  if (LastSavedServerPort != SmtpPort     ) ChangedItems++;
  if (LastSavedUserReq    != EmailUserReq ) ChangedItems++;
  if (LastSavedUserName   != EmailUsername) ChangedItems++;
  if (LastSavedPassword   != EmailPassword) ChangedItems++;
  
  return ChangedItems;
}

//-----------

function SetSettingsSaved()
{
  LastSavedTo         = document.getElementById('to_address').value;  
  LastSavedTo2        = document.getElementById('to_address2').value; 
  LastSavedTo3        = document.getElementById('to_address3').value; 
  LastSavedTo4        = document.getElementById('to_address4').value; 
  LastSavedCc         = document.getElementById("cc_address").value;  
  LastSavedFrom       = document.getElementById("from_address").value;
  LastSavedSubject    = document.getElementById("subject").value;     
  LastSavedServer     = document.getElementById("smtp_address").value;
  LastSavedServerPort = document.getElementById("smtp_port").value;   
  LastSavedUserReq    = GetCheckBoxValue("smtp_requires_name_pass",0);
  LastSavedUserName   = document.getElementById("smtp_user").value;   
  LastSavedPassword   = document.getElementById("smtp_pass").value;   
}

//-----------

function TestEmailClick(Group)
{
  var ChangedItems = AreSettingsChanged();

  if (ChangedItems > 0){
    if (confirm("이메일 설정이 저장되지않고 변경되었습니다.\n우선 새로운 이메일 설정을 저장하시겠습니까?") == true){
      if (SaveEmailClick() != 0) return;
    }
  }
   
  xmlhttpTestEmail = loadXMLDocASynch("data_srv.cgi", "action=SendTestEmail:"+Group, onStateChangeTestEmail,onTimeoutTestEmail,15000);
}

//-----------

function onTimeoutTestEmail()
{
  xmlhttpTestEmail.onreadystatechange = function() {}
  xmlhttpTestEmail.abort();
}

//-----------

function onStateChangeTestEmail()
{
  if (xmlhttpTestEmail != null){
    if (xmlhttpTestEmail.readyState == 4){
      if (xmlhttpTestEmail.status == 200){

        var Response = decodeURIComponent(xmlhttpTestEmail.responseText);

        var Result_arr = [];
        Result_arr = Response.split('\x1F');
        if (Result_arr.length == 2){
    	    //Result_arr[0]
  	      alert(Result_arr[1]);
        }

        onTimeoutTestEmail();
      }
    }
  }
}

//-----------

function SetEnabledUserNamePass()
{
  var obj_ref_req = document.getElementById('smtp_requires_name_pass');

	if (obj_ref_req != null){
    SetEnabled("smtp_user",obj_ref_req.checked);
    SetEnabled("smtp_pass",obj_ref_req.checked);
  }
}

//-----------

function SaveEmailClick()
{
  var args = [];

  if (EmailLicense == 0) alert("설정후 저장이 제한됨. 이메일 라이센스가 없음.");

//--
  var ToAddress   = document.getElementById('to_address').value;
  if (CheckString(ToAddress,200) != 0){
    alert("Error: The TO E-MAIL ADDRESSES can not be longer than 200 characters (Group 1).");
    return -1;
  }
  var ToAddress2   = document.getElementById('to_address2').value;
  if (CheckString(ToAddress2,200) != 0){
    alert("Error: The TO E-MAIL ADDRESSES can not be longer than 200 characters (Group 2).");
    return -1;
  }
  var ToAddress3   = document.getElementById('to_address3').value;
  if (CheckString(ToAddress3,200) != 0){
    alert("Error: The TO E-MAIL ADDRESSES can not be longer than 200 characters (Group 3).");
    return -1;
  }
  var ToAddress4   = document.getElementById('to_address4').value;
  if (CheckString(ToAddress4,200) != 0){
    alert("Error: The TO E-MAIL ADDRESSES can not be longer than 200 characters (Group 4).");
    return -1;
  }
  
  if (CheckEmailAddresses(ToAddress) != 0){
    alert("Error: The TO E-MAIL ADDRESSES contains invalid E-mail address (Group 1).");
    return -1;
  }
  if (CheckEmailAddresses(ToAddress2) != 0){
    alert("Error: The TO E-MAIL ADDRESSES contains invalid E-mail address (Group 2).");
    return -1;
  }
  if (CheckEmailAddresses(ToAddress3) != 0){
    alert("Error: The TO E-MAIL ADDRESSES contains invalid E-mail address (Group 3).");
    return -1;
  }
  if (CheckEmailAddresses(ToAddress4) != 0){
    alert("Error: The TO E-MAIL ADDRESSES contains invalid E-mail address (Group 4).");
    return -1;
  }

  var CcAddress   = document.getElementById("cc_address").value;
  if (CheckString(CcAddress,200) != 0){
    alert("에러: 이메일 참조수신인은 200 문자 이하여야 합니다.");
    return -1;
  }
  if (CheckEmailAddresses(CcAddress) != 0){
    alert("에러: 이메일 참조수신인이 유효하지 않은 이메일 주소를 포함하고 있습니다.");
    return -1;
  }

  var FromAddress = document.getElementById("from_address").value;
  if (CheckString(FromAddress,100) != 0){
    alert("에러: 발신자 이메일 주소는 100문자이상을 넘을 수 없습니다.");
    return -1;
  }
  if (CheckEmailAddresses(FromAddress) != 0){
    alert("에러: 발신자이메일 주소가 유효하지 않은 이메일 주소입니다.");
    return -1;
  }

  var Subject     = document.getElementById("subject").value;
  if (CheckString(Subject,100) != 0){
    alert("에러: 제목은 100문자를 초과할 수 없습니다.");
    return -1;
  }

  var SmtpServer  = document.getElementById("smtp_address").value;
  if (CheckString(SmtpServer,100) != 0){
    alert("에러: SMTP 서버는 100문자를 초과할 수 없습니다.");
    return -1;
  }

  var SmtpPort    = document.getElementById("smtp_port").value;
  if (CheckNumber(SmtpPort,0,65535) != 0){
    alert("에러: SMTP 포트는 0에서 65535 범위이어야 합니다.");
    return -1;
  }

  args.push("setting_Email-ToAddress:"   + encodeURIComponent(ToAddress) );
  args.push("setting_Email-ToAddress2:"  + encodeURIComponent(ToAddress2) );
  args.push("setting_Email-ToAddress3:"  + encodeURIComponent(ToAddress3) );
  args.push("setting_Email-ToAddress4:"  + encodeURIComponent(ToAddress4) );
  args.push("setting_Email-CcAddress:"   + encodeURIComponent(CcAddress) );
  args.push("setting_Email-FromAddress:" + encodeURIComponent(FromAddress) );
  args.push("setting_Email-Subject:"     + encodeURIComponent(Subject) );
  args.push("setting_Email-Server:"      + encodeURIComponent(SmtpServer) );
  args.push("setting_Email-ServerPort:"  + SmtpPort);
//--

  var EmailUsername = document.getElementById("smtp_user").value;
  if (CheckString(EmailUsername,50) != 0){
    alert("에러: SMTP 유저명은 50문자를 초과할 수 없습니다.");
    return -1;
  }

  var EmailPassword = document.getElementById("smtp_pass").value;
  if (CheckString(EmailPassword,50) != 0){
    alert("에러: SMTP 암호는 50문자를 초과할 수 없습니다.");
    return -1;
  }

  args.push("setting_Email-UserRequired:"+ GetCheckBoxValue("smtp_requires_name_pass",0));
  args.push("setting_Email-User:"        + encodeURIComponent(EmailUsername) );
  args.push("setting_Email-Pass:"        + encodeURIComponent(EmailPassword) );

  var EmailIntervalDays    = parseInt(document.getElementById("alive_email_interval_days").value);
  var EmailIntervalHours   = parseInt(document.getElementById("alive_email_interval_hours").value);
  var EmailInterval        = (EmailIntervalDays * 24) + EmailIntervalHours;
  
  var AliveEmailGroup1 = GetCheckBoxValue("alive_email_enable_group1",0);
  var AliveEmailGroup2 = GetCheckBoxValue("alive_email_enable_group2",0);
  var AliveEmailGroup3 = GetCheckBoxValue("alive_email_enable_group3",0);
  var AliveEmailGroup4 = GetCheckBoxValue("alive_email_enable_group4",0);
  var EmailIntervalEnabled = (AliveEmailGroup1 << 0) | (AliveEmailGroup2 << 1) | (AliveEmailGroup3 << 2) | (AliveEmailGroup4 << 3);
  
  if (isNaN(EmailInterval)){
    alert("에러: 정기적 이메일 간격이 유효한 숫자이어야 합니다.");
    return -1;
  }
  
  if ((EmailIntervalDays < 0) || (EmailIntervalDays > 365)){
    alert("에러: 정기적 이메일 간격 날짜는 0에서 365일 범위이어야 합니다.");
    return -1;
  }

  if ((EmailIntervalHours < 0) || (EmailIntervalHours > 23)){
    alert("에러: 정기적 이메일 간격 시간은 0에서 23시간 범위이어야 합니다.");
    return -1;
  }
  
  if (EmailInterval <= 0){
    alert("에러: 정기적 이메일 주기의 최소값은 1시간입니다.");
    return -1;
  }

  if (EmailInterval > (365*24)){
    alert("에러: 정기적 이메일 주기의 최대값은 365일입니다.");
    return -1;
  }

  args.push("setting_Email-AliveEnabled:"+ EmailIntervalEnabled);
  args.push("setting_Email-AliveInteval:"+ encodeURIComponent(EmailInterval));

  var Result = SaveSegmentedSettingsCombined("data_srv.cgi",args,"save-settings",1);
  if (Result.Code != 200) return -1;
  
  SetSettingsSaved();
  return 0;
}
//-----------

function SetEnabledAliveEmail()
{
  var Checked1 = GetCheckBoxValue('alive_email_enable_group1',0);
  var Checked2 = GetCheckBoxValue('alive_email_enable_group2',0);
  var Checked3 = GetCheckBoxValue('alive_email_enable_group3',0);
  var Checked4 = GetCheckBoxValue('alive_email_enable_group4',0);

  var Checked = (Checked1 || Checked2 || Checked3 || Checked4)

  SetEnabled("alive_email_interval_days",Checked);
  SetEnabled("alive_email_interval_hours",Checked);
}