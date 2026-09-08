Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
"$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
"$bitmap = New-Object System.Drawing.Bitmap ".width", ".height"
"$graphics = [System.Drawing.Graphics]::FromImage(")
"$graphics.CopyFromScreen(".Location, [System.Drawing.Point]::Empty, ".size)
"$bitmap.Save('C:\Users\DELL\OneDrive\Desktop\erp2\screenshot.png', [System.Drawing.Imaging.ImageFormat]::Png)
"$graphics.Dispose()
"$bitmap.Dispose()
