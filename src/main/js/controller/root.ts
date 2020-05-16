import {Emitter} from '../misc/emitter';
import {TypeUtil} from '../misc/type-util';
import {Disposable} from '../model/disposable';
import {Folder} from '../model/folder';
import {UiControllerList} from '../model/ui-controller-list';
import {RootView} from '../view/root';
import {FolderController} from './folder';
import {InputBindingController} from './input-binding';
import {MonitorBindingController} from './monitor-binding';
import {UiController} from './ui';

interface Config {
	disposable: Disposable;
	expanded?: boolean;
	title?: string;
}

export type EventName = 'fold' | 'inputchange' | 'monitorupdate';

function createFolder(config: Config): Folder | null {
	if (!config.title) {
		return null;
	}

	return new Folder(
		config.title,
		TypeUtil.getOrDefault<boolean>(config.expanded, true),
	);
}

/**
 * @hidden
 */
export class RootController {
	public readonly disposable: Disposable;
	public readonly emitter: Emitter<EventName>;
	public readonly folder: Folder | null;
	public readonly view: RootView;
	private doc_: Document;
	private ucList_: UiControllerList;

	constructor(document: Document, config: Config) {
		this.onFolderChange_ = this.onFolderChange_.bind(this);
		this.onRootFolderChange_ = this.onRootFolderChange_.bind(this);
		this.onTitleClick_ = this.onTitleClick_.bind(this);
		this.onUiControllerListAdd_ = this.onUiControllerListAdd_.bind(this);
		this.onInputChange_ = this.onInputChange_.bind(this);
		this.onMonitorUpdate_ = this.onMonitorUpdate_.bind(this);

		this.emitter = new Emitter();

		this.folder = createFolder(config);

		this.ucList_ = new UiControllerList();
		this.ucList_.emitter.on('add', this.onUiControllerListAdd_);

		this.doc_ = document;
		this.disposable = config.disposable;
		this.view = new RootView(this.doc_, {
			disposable: this.disposable,
			folder: this.folder,
		});
		if (this.view.titleElement) {
			this.view.titleElement.addEventListener('click', this.onTitleClick_);
		}
		if (this.folder) {
			this.folder.emitter.on('change', this.onRootFolderChange_);
		}
	}

	get document(): Document {
		return this.doc_;
	}

	get uiControllerList(): UiControllerList {
		return this.ucList_;
	}

	private onUiControllerListAdd_(uc: UiController, index: number) {
		if (uc instanceof InputBindingController) {
			const emitter = uc.binding.value.emitter;
			emitter.on('change', this.onInputChange_);
		} else if (uc instanceof MonitorBindingController) {
			const emitter = uc.binding.value.emitter;
			emitter.on('update', this.onMonitorUpdate_);
		} else if (uc instanceof FolderController) {
			const emitter = uc.emitter;
			emitter.on('fold', this.onFolderChange_);
			emitter.on('inputchange', this.onInputChange_);
			emitter.on('monitorupdate', this.onMonitorUpdate_);
		}

		this.view.containerElement.insertBefore(
			uc.view.element,
			this.view.containerElement.children[index],
		);
	}

	private onTitleClick_() {
		if (this.folder) {
			this.folder.expanded = !this.folder.expanded;
		}
	}

	private onInputChange_(value: unknown): void {
		this.emitter.emit('inputchange', [value]);
	}

	private onMonitorUpdate_(value: unknown): void {
		this.emitter.emit('monitorupdate', [value]);
	}

	private onFolderChange_(): void {
		this.emitter.emit('fold');
	}

	private onRootFolderChange_(): void {
		this.emitter.emit('fold');
	}
}
