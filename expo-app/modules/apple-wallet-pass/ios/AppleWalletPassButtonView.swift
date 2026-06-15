import ExpoModulesCore
import PassKit
import UIKit

/**
 * Apple-approved Add to Apple Wallet control (PKAddPassButton).
 * https://developer.apple.com/wallet/add-to-apple-wallet-guidelines/
 */
final class AppleWalletPassButtonView: ExpoView {
  let onPress = EventDispatcher()
  private var passButton: PKAddPassButton

  required init(appContext: AppContext? = nil) {
    passButton = PKAddPassButton(addPassButtonStyle: .black)
    super.init(appContext: appContext)
    clipsToBounds = true
    passButton.addTarget(self, action: #selector(handlePress), for: .touchUpInside)
    addSubview(passButton)
  }

  func setButtonStyle(_ style: String) {
    let pkStyle: PKAddPassButtonStyle = style == "outline" ? .blackOutline : .black
    passButton.removeFromSuperview()
    passButton = PKAddPassButton(addPassButtonStyle: pkStyle)
    passButton.addTarget(self, action: #selector(handlePress), for: .touchUpInside)
    addSubview(passButton)
    setNeedsLayout()
  }

  @objc private func handlePress() {
    onPress([:])
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    passButton.frame = bounds
  }
}
