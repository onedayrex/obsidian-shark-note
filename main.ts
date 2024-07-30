import {
	App,
	Editor,
	MarkdownView,
	Modal, Notice,
	Plugin,
	PluginSettingTab,
	requestUrl,
	Setting
} from 'obsidian';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	syncPath: string;
	cookie: string
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	syncPath: 'sharkNotes',
	cookie: ''
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();
		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', '闪念笔记', (evt: MouseEvent) => {
			if(!this.settings.cookie){
				new Notice('Please set cookie first!');
				return;
			}
			// Called when the user clicks the icon.
			const myHeaders = {
				"priority": "u=1, i",
				"Cookie": this.settings.cookie,
				"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
				"content-type": "application/json"
			};

			requestUrl({
				url:"https://api.juejin.cn/note_api/note/list_all?aid=6587&uuid=7354201638113019431",
				method: 'POST',
				headers: myHeaders
			})
				.then(result => {
					new Notice('Pull notes success!');
					//Get Shark Notes Base Folder
					let folder = this.app.vault.getFolderByPath(this.settings.syncPath);
					if (!folder) {
						new Notice(`Create Folder With Setting ${this.settings.syncPath}`)
						this.app.vault.createFolder(this.settings.syncPath);
						folder = this.app.vault.getFolderByPath(this.settings.syncPath);
					}

					//Delete Origin notes
					folder?.children.forEach(async (file) => {
						await this.app.vault.delete(file);
					})
					new Notice(`Delete Shark Notes`)
					//sync notes
					if(result && result.json){
						new Notice(`Sync notes count ${result.json.count}`)
						result.json.data.forEach((item:any) => {
							let content = item.note_info.content;
							const extra = item.note_info.extra;
							if(extra){
								const jsonExtra = JSON.parse(extra);
								const reference = `\n
								> 标题：${jsonExtra.title}\n
								> 网址：${jsonExtra.url}\n
								> 引用：${jsonExtra.content}`;
								content += reference;
							}
							const tags = item.tags;
							if(tags){
								let tagsContent ='---' +
									'tags:';
								tags.forEach((tag:string) => {
									tagsContent+=`\n  - ${tag}`;
								})

							}
							this.app.vault.create(`${this.settings.syncPath}/${item.note_meta.title}.md`, content, {
								ctime: item.note_meta.ctime,
								mtime: item.note_meta.mtime,
							})
						})
					}


				})
				.catch(error => console.log('error', error));
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Sync Path')
			.setDesc('config where to save your shark notes relative')
			.addText(text => text
				.setPlaceholder('notes path')
				.setValue(this.plugin.settings.syncPath)
				.onChange(async (value) => {
					this.plugin.settings.syncPath = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName('cookie')
			.setDesc('cookie with shark notes')
			.addText(text => text
				.setPlaceholder('cookies')
				.setValue(this.plugin.settings.cookie)
				.onChange(async (value) => {
					this.plugin.settings.cookie = value;
					await this.plugin.saveSettings();
				})
			)
	}
}
