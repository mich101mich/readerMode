#!/bin/bash

script_dir="$(realpath "$(dirname "$0")")"

input_dir="$script_dir/package"
output_file="$script_dir/package.zip"

rm -f "$output_file"
zip -r "$output_file" "$input_dir"
