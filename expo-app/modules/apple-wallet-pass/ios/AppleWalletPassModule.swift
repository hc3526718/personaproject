import ExpoModulesCore
import PassKit
import UIKit

private class AddPassDelegate: NSObject, PKAddPassesViewControllerDelegate {
  var onFinish: ((Bool) -> Void)?
  let expectedPass: PKPass

  init(expectedPass: PKPass) {
    self.expectedPass = expectedPass
  }

  func addPassesViewControllerDidFinish(_ controller: PKAddPassesViewController) {
    controller.dismiss(animated: true) {
      let library = PKPassLibrary()
      let added = library.containsPass(self.expectedPass)
      self.onFinish?(added)
    }
  }
}

public class AppleWalletPassModule: Module {
  private var delegate: AddPassDelegate?

  public func definition() -> ModuleDefinition {
    Name("AppleWalletPass")

    Function("canAddPasses") {
      PKAddPassesViewController.canAddPasses()
    }

    AsyncFunction("addPassFromBase64") { (base64: String, promise: Promise) in
      guard let passData = Data(base64Encoded: base64) else {
        promise.reject("INVALID_PASS", "Pass data could not be decoded.")
        return
      }
      self.presentPass(data: passData, promise: promise)
    }.runOnQueue(.main)

    AsyncFunction("addPassFromFile") { (fileUri: String, promise: Promise) in
      guard let url = URL(string: fileUri) else {
        promise.reject("INVALID_URI", "Invalid pass file URI.")
        return
      }
      do {
        let passData = try Data(contentsOf: url)
        self.presentPass(data: passData, promise: promise)
      } catch {
        promise.reject("READ_PASS", "Could not read pass file: \(error.localizedDescription)")
      }
    }.runOnQueue(.main)
  }

  private func presentPass(data: Data, promise: Promise) {
    do {
      let pass = try PKPass(data: data)
      guard let addVC = PKAddPassesViewController(pass: pass) else {
        promise.reject("INVALID_PASS", "Could not create Wallet pass preview.")
        return
      }
      guard let root = Self.topViewController() else {
        promise.reject("NO_VIEW", "Could not present Wallet sheet.")
        return
      }

      let delegate = AddPassDelegate(expectedPass: pass)
      delegate.onFinish = { added in
        promise.resolve(added)
        self.delegate = nil
      }
      self.delegate = delegate
      addVC.delegate = delegate
      root.present(addVC, animated: true)
    } catch {
      promise.reject("INVALID_PASS", error.localizedDescription)
    }
  }

  private static func topViewController() -> UIViewController? {
    let window = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .flatMap { $0.windows }
      .first { $0.isKeyWindow }
    var vc = window?.rootViewController
    while let presented = vc?.presentedViewController {
      vc = presented
    }
    return vc
  }
}
