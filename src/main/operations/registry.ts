import type { Operation, OperationMeta } from './types'
import { createBranchOperation } from './create-branch'
import { deleteBranchOperation } from './delete-branch'
import { autoMergeOperation } from './auto-merge'
import { recreateDevelopmentOperation } from './recreate-development'
import { recreateTestOperation } from './recreate-test'
import { tagAllOperation } from './tag-all'

const operations: Operation[] = [
  createBranchOperation,
  deleteBranchOperation,
  autoMergeOperation,
  recreateDevelopmentOperation,
  recreateTestOperation,
  tagAllOperation,
]

export function getOperations(): Operation[] {
  return operations
}

export function getOperation(id: string): Operation | undefined {
  return operations.find(op => op.id === id)
}

export function getOperationMetas(): OperationMeta[] {
  return operations.map(({ id, name, description, icon, parameters, repoSelection, supportsDryRun }) => ({
    id,
    name,
    description,
    icon,
    parameters,
    repoSelection,
    supportsDryRun,
  }))
}
