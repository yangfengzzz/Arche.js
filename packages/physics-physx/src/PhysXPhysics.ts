import {
  IBoxColliderShape,
  ICapsuleCharacterControllerDesc,
  ICapsuleColliderShape,
  IConfigurableJoint,
  IDynamicCollider,
  IFixedJoint,
  IHingeJoint,
  IPhysics,
  IPhysicsManager,
  IPhysicsMaterial,
  IPlaneColliderShape,
  ISphereColliderShape,
  ISphericalJoint,
  ISpringJoint,
  IStaticCollider,
  ITranslationalJoint
} from "@arche-engine/design";
import { PhysXPhysicsMaterial } from "./PhysXPhysicsMaterial";
import { PhysXPhysicsManager } from "./PhysXPhysicsManager";
import { PhysXBoxColliderShape, PhysXSphereColliderShape, PhysXCapsuleColliderShape } from "./shape";
import { PhysXDynamicCollider } from "./PhysXDynamicCollider";
import { PhysXStaticCollider } from "./PhysXStaticCollider";
import { StaticInterfaceImplement } from "./StaticInterfaceImplement";
import { Quaternion, Vector3 } from "arche-engine";
import { PhysXPlaneColliderShape } from "./shape/PhysXPlaneColliderShape";
import { PhysXRuntimeMode } from "./enum/PhysXRuntimeMode";
import { PhysXFixedJoint } from "./joint/PhysXFixedJoint";
import { PhysXCollider } from "./PhysXCollider";
import { PhysXHingeJoint } from "./joint/PhysXHingeJoint";
import { PhysXSphericalJoint } from "./joint/PhysXSphericalJoint";
import { PhysXSpringJoint } from "./joint/PhysXSpringJoint";
import { PhysXTranslationalJoint } from "./joint/PhysXTranslationalJoint";
import { PhysXConfigurableJoint } from "./joint/PhysXConfigurableJoint";
import { PhysXCapsuleCharacterControllerDesc } from "./characterkinematic/PhysXCapsuleCharacterControllerDesc";

/**
 * PhysX wasm compiler target
 */
enum PhysXTarget {
  release,
  profile,
  checked,
  debug
}

/**
 * PhysX object creation.
 */
@StaticInterfaceImplement<IPhysics>()
export class PhysXPhysics {
  /** @internal PhysX wasm object */
  static _physX: any;
  /** @internal Physx physics object */
  static _pxPhysics: any;
  /** Physx Visual Debugger */
  static pvdTransport: any;
  static socket: WebSocket;
  static queue = [];
  static physxTarget: PhysXTarget = PhysXTarget.release;

  /**
   * Initialize PhysXPhysics.
   * @param runtimeMode - Runtime mode
   * @returns Promise object
   */
  public static init(runtimeMode: PhysXRuntimeMode = PhysXRuntimeMode.Auto): Promise<void> {
    const scriptPromise = new Promise((resolve) => {
      const script = document.createElement("script");
      document.body.appendChild(script);
      script.async = true;
      script.onload = resolve;

      const supported = (() => {
        try {
          if (typeof WebAssembly === "object" && typeof WebAssembly.instantiate === "function") {
            const module = new WebAssembly.Module(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));
            if (module instanceof WebAssembly.Module)
              return new WebAssembly.Instance(module) instanceof WebAssembly.Instance;
          }
        } catch (e) {}
        return false;
      })();
      if (runtimeMode == PhysXRuntimeMode.Auto) {
        if (supported) {
          runtimeMode = PhysXRuntimeMode.WebAssembly;
        } else {
          runtimeMode = PhysXRuntimeMode.JavaScript;
        }
      }

      if (runtimeMode == PhysXRuntimeMode.JavaScript) {
        script.src = "https://gw.alipayobjects.com/os/lib/arche-engine/physics-physx/0.0.11/dist/physx.release.js";
      } else if (runtimeMode == PhysXRuntimeMode.WebAssembly) {
        script.src = "https://gw.alipayobjects.com/os/lib/arche-engine/physics-physx/0.0.11/dist/physx.release.js";
      }
    });

    return new Promise((resolve) => {
      scriptPromise.then(() => {
        (<any>window).PHYSX().then((PHYSX) => {
          PhysXPhysics._init(PHYSX);
          PhysXPhysicsManager._init();
          console.log("PhysX loaded.");
          resolve();
        });
      });
    });
  }

  private static _setupPVD() {
    this.pvdTransport = PhysXPhysics._physX.PxPvdTransport.implement({
      connect: function () {
        PhysXPhysics.socket = new WebSocket("ws://127.0.0.1:8090", ["binary"]);
        PhysXPhysics.socket.onopen = () => {
          console.log("Connected to PhysX Debugger");
          PhysXPhysics.queue.forEach((data) => PhysXPhysics.socket.send(data));
          PhysXPhysics.queue = [];
        };
        PhysXPhysics.socket.onclose = () => {};
        return true;
      },
      disconnect: function () {
        console.log("Socket disconnect");
      },
      isConnected: function () {},
      write: function (inBytes, inLength) {
        const data = PhysXPhysics._physX.HEAPU8.slice(inBytes, inBytes + inLength);
        if (PhysXPhysics.socket.readyState === WebSocket.OPEN) {
          if (PhysXPhysics.queue.length) {
            PhysXPhysics.queue.forEach((data) => PhysXPhysics.socket.send(data));
            PhysXPhysics.queue.length = 0;
          }
          PhysXPhysics.socket.send(data);
        } else {
          PhysXPhysics.queue.push(data);
        }
        return true;
      }
    });
  }

  private static _setup() {
    const version = PhysXPhysics._physX.PX_PHYSICS_VERSION;
    const defaultErrorCallback = new PhysXPhysics._physX.PxDefaultErrorCallback();
    const allocator = new PhysXPhysics._physX.PxDefaultAllocator();
    const foundation = PhysXPhysics._physX.PxCreateFoundation(version, allocator, defaultErrorCallback);

    if (PhysXPhysics.physxTarget != PhysXTarget.release) {
      this._setupPVD();
      const gPvd = PhysXPhysics._physX.PxCreatePvd(foundation);
      gPvd.connect(
        PhysXPhysics.pvdTransport,
        new PhysXPhysics._physX.PxPvdInstrumentationFlags(PhysXPhysics._physX.PxPvdInstrumentationFlag.eALL.value)
      );

      PhysXPhysics._pxPhysics = PhysXPhysics._physX.PxCreatePhysics(
        version,
        foundation,
        new PhysXPhysics._physX.PxTolerancesScale(),
        true,
        gPvd
      );
    } else {
      PhysXPhysics._pxPhysics = PhysXPhysics._physX.PxCreatePhysics(
        version,
        foundation,
        new PhysXPhysics._physX.PxTolerancesScale(),
        false,
        null
      );
    }

    PhysXPhysics._physX.PxInitExtensions(PhysXPhysics._pxPhysics, null);
  }

  /**
   * {@inheritDoc IPhysics.createPhysicsManager }
   */
  static createPhysicsManager(
    onContactBegin?: (obj1: number, obj2: number) => void,
    onContactEnd?: (obj1: number, obj2: number) => void,
    onContactStay?: (obj1: number, obj2: number) => void,
    onTriggerBegin?: (obj1: number, obj2: number) => void,
    onTriggerEnd?: (obj1: number, obj2: number) => void,
    onTriggerStay?: (obj1: number, obj2: number) => void
  ): IPhysicsManager {
    return new PhysXPhysicsManager(
      onContactBegin,
      onContactEnd,
      onContactStay,
      onTriggerBegin,
      onTriggerEnd,
      onTriggerStay
    );
  }

  /**
   * {@inheritDoc IPhysics.createStaticCollider }
   */
  static createStaticCollider(position: Vector3, rotation: Quaternion): IStaticCollider {
    return new PhysXStaticCollider(position, rotation);
  }

  /**
   * {@inheritDoc IPhysics.createDynamicCollider }
   */
  static createDynamicCollider(position: Vector3, rotation: Quaternion): IDynamicCollider {
    return new PhysXDynamicCollider(position, rotation);
  }

  /**
   * {@inheritDoc IPhysics.createPhysicsMaterial }
   */
  static createPhysicsMaterial(
    staticFriction: number,
    dynamicFriction: number,
    bounciness: number,
    frictionCombine: number,
    bounceCombine: number
  ): IPhysicsMaterial {
    return new PhysXPhysicsMaterial(staticFriction, dynamicFriction, bounciness, frictionCombine, bounceCombine);
  }

  /**
   * {@inheritDoc IPhysics.createBoxColliderShape }
   */
  static createBoxColliderShape(uniqueID: number, size: Vector3, material: PhysXPhysicsMaterial): IBoxColliderShape {
    return new PhysXBoxColliderShape(uniqueID, size, material);
  }

  /**
   * {@inheritDoc IPhysics.createSphereColliderShape }
   */
  static createSphereColliderShape(
    uniqueID: number,
    radius: number,
    material: PhysXPhysicsMaterial
  ): ISphereColliderShape {
    return new PhysXSphereColliderShape(uniqueID, radius, material);
  }

  /**
   * {@inheritDoc IPhysics.createPlaneColliderShape }
   */
  static createPlaneColliderShape(uniqueID: number, material: PhysXPhysicsMaterial): IPlaneColliderShape {
    return new PhysXPlaneColliderShape(uniqueID, material);
  }

  /**
   * {@inheritDoc IPhysics.createCapsuleColliderShape }
   */
  static createCapsuleColliderShape(
    uniqueID: number,
    radius: number,
    height: number,
    material: PhysXPhysicsMaterial
  ): ICapsuleColliderShape {
    return new PhysXCapsuleColliderShape(uniqueID, radius, height, material);
  }

  //MARK: - Joint
  static createFixedJoint(
    actor0: PhysXCollider,
    position0: Vector3,
    rotation0: Quaternion,
    actor1: PhysXCollider,
    position1: Vector3,
    rotation1: Quaternion
  ): IFixedJoint {
    return new PhysXFixedJoint(actor0, position0, rotation0, actor1, position1, rotation1);
  }

  static createHingeJoint(
    actor0: PhysXCollider,
    position0: Vector3,
    rotation0: Quaternion,
    actor1: PhysXCollider,
    position1: Vector3,
    rotation1: Quaternion
  ): IHingeJoint {
    return new PhysXHingeJoint(actor0, position0, rotation0, actor1, position1, rotation1);
  }

  static createSphericalJoint(
    actor0: PhysXCollider,
    position0: Vector3,
    rotation0: Quaternion,
    actor1: PhysXCollider,
    position1: Vector3,
    rotation1: Quaternion
  ): ISphericalJoint {
    return new PhysXSphericalJoint(actor0, position0, rotation0, actor1, position1, rotation1);
  }

  static createSpringJoint(
    actor0: PhysXCollider,
    position0: Vector3,
    rotation0: Quaternion,
    actor1: PhysXCollider,
    position1: Vector3,
    rotation1: Quaternion
  ): ISpringJoint {
    return new PhysXSpringJoint(actor0, position0, rotation0, actor1, position1, rotation1);
  }

  static createTranslationalJoint(
    actor0: PhysXCollider,
    position0: Vector3,
    rotation0: Quaternion,
    actor1: PhysXCollider,
    position1: Vector3,
    rotation1: Quaternion
  ): ITranslationalJoint {
    return new PhysXTranslationalJoint(actor0, position0, rotation0, actor1, position1, rotation1);
  }

  static createConfigurableJoint(
    actor0: PhysXCollider,
    position0: Vector3,
    rotation0: Quaternion,
    actor1: PhysXCollider,
    position1: Vector3,
    rotation1: Quaternion
  ): IConfigurableJoint {
    return new PhysXConfigurableJoint(actor0, position0, rotation0, actor1, position1, rotation1);
  }

  //MARK: - Character Controller
  static createCapsuleCharacterControllerDesc(): ICapsuleCharacterControllerDesc {
    return new PhysXCapsuleCharacterControllerDesc();
  }

  private static _init(PHYSX: any): void {
    PhysXPhysics._physX = PHYSX;
    const version = PhysXPhysics._physX.PX_PHYSICS_VERSION;
    const defaultErrorCallback = new PhysXPhysics._physX.PxDefaultErrorCallback();
    const allocator = new PhysXPhysics._physX.PxDefaultAllocator();
    const foundation = PhysXPhysics._physX.PxCreateFoundation(version, allocator, defaultErrorCallback);

    this._pxPhysics = PhysXPhysics._physX.PxCreatePhysics(
      version,
      foundation,
      new PhysXPhysics._physX.PxTolerancesScale(),
      false,
      null
    );

    PhysXPhysics._physX.PxInitExtensions(this._pxPhysics, null);
  }
}
