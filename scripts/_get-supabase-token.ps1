$code = @'
using System;
using System.Runtime.InteropServices;
using System.Text;

public class SupabaseCred {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct NativeCredential {
    public int Flags;
    public int Type;
    public IntPtr TargetName;
    public IntPtr Comment;
    public long LastWritten;
    public int CredentialBlobSize;
    public IntPtr CredentialBlob;
    public int Persist;
    public int Attribute;
    public IntPtr TargetAlias;
    public IntPtr UserName;
  }

  [DllImport("advapi32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  public static extern bool CredRead(string target, int type, int reservedFlag, out IntPtr cred);
  [DllImport("advapi32.dll", SetLastError = true)]
  public static extern bool CredFree(IntPtr cred);

  public static string ReadUtf8(string target) {
    IntPtr credPtr;
    if (!CredRead(target, 1, 0, out credPtr)) return null;
    try {
      var cred = (NativeCredential)Marshal.PtrToStructure(credPtr, typeof(NativeCredential));
      var bytes = new byte[cred.CredentialBlobSize];
      Marshal.Copy(cred.CredentialBlob, bytes, 0, cred.CredentialBlobSize);
      return Encoding.UTF8.GetString(bytes);
    } finally {
      CredFree(credPtr);
    }
  }

  public static string ReadUtf16(string target) {
    IntPtr credPtr;
    if (!CredRead(target, 1, 0, out credPtr)) return null;
    try {
      var cred = (NativeCredential)Marshal.PtrToStructure(credPtr, typeof(NativeCredential));
      var bytes = new byte[cred.CredentialBlobSize];
      Marshal.Copy(cred.CredentialBlob, bytes, 0, cred.CredentialBlobSize);
      return Encoding.Unicode.GetString(bytes);
    } finally {
      CredFree(credPtr);
    }
  }
}
'@

if (-not ([System.Management.Automation.PSTypeName]'SupabaseCred').Type) {
  Add-Type -TypeDefinition $code -Language CSharp
}

$utf8 = [SupabaseCred]::ReadUtf8('Supabase CLI:supabase')
$utf16 = [SupabaseCred]::ReadUtf16('Supabase CLI:supabase')
$pick = if ($utf8 -match '^sbp_') { $utf8 } elseif ($utf16 -match '^sbp_') { $utf16 } else { $utf8 }
if (-not $pick) { Write-Error 'Could not read Supabase CLI credential'; exit 1 }
$out = Join-Path $PSScriptRoot '_token.tmp'
[System.IO.File]::WriteAllText($out, $pick)
Write-Output "saved len=$($pick.Length) sbp=$($pick.StartsWith('sbp_'))"
