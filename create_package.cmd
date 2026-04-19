@echo off
set script_dir=%~dp0
set input_dir=%script_dir%package
set output_file=%script_dir%package.zip

if exist "%output_file%" del "%output_file%"
powershell -Command "Compress-Archive -Path '%input_dir%' -DestinationPath '%output_file%'"
