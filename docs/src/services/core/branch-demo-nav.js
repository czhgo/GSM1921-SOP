// Compatibility re-export for the former secretary-workspace drilldown module.
// New UI must use branch-readonly-nav.js and keep the Party Committee identity.
export {
  buildBranchReadOnlyUrl as buildBranchDemoUrl,
  openBranchReadOnly as openBranchDemo,
  bindBranchReadOnlyButtons as bindBranchDemoButtons,
  isPartyStaffBranchReadOnlyAllowed as isPartyStaffBranchDemoAllowed,
  isReadonlyBranchDrilldown,
} from './branch-readonly-nav.js?v=20261018h';
