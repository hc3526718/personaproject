require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'AppleWalletPass'
  s.version        = package['version']
  s.summary        = 'Present PKAddPassesViewController for .pkpass files'
  s.description    = 'Native Apple Wallet add-pass sheet for Dalton event tickets'
  s.license        = 'MIT'
  s.author         = 'Dalton Grant Academy'
  s.homepage       = 'https://daltongrantacademy.vercel.app'
  s.platform       = :ios, '15.1'
  s.swift_version  = '5.4'
  s.source         = { :git => '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
  s.source_files = '**/*.{h,m,swift}'
end
