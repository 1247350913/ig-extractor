$Chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$Profile = Join-Path $PSScriptRoot "chrome-profile"
$Url = "https://www.instagram.com/camhirsh/"

Start-Process -FilePath $Chrome -ArgumentList @(
    "--user-data-dir=`"$Profile`"",
    "--remote-debugging-port=9222",
    "--remote-allow-origins=*",
    "--new-window",
    $Url
)