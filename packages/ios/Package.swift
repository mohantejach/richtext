// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "RichTextiOS",
    platforms: [
        .iOS(.v16),
        .macOS(.v13),
    ],
    products: [
        .library(name: "RichTextiOS", targets: ["RichTextiOS"]),
    ],
    targets: [
        .target(name: "RichTextiOS"),
        .testTarget(
            name: "RichTextiOSTests",
            dependencies: ["RichTextiOS"]
        ),
    ]
)
