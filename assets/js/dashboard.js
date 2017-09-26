$(function() {
	//Peerlist更新間隔(ミリ秒)
	var timerInterval = 10000;
	//TimerID格納用配列
	var timerIDs = [];
	//dashboardエンドポイント(ajaxのUrlプレフィックス)
	var endpoint = "";
	//Csrfトークン
	var csrfToken = Cookies.get('csrfToken');

	/**
	 * [ログイン機能(ECL経由)]
	 * SSS共通ヘッダのログアウトボタンが押下された際にダッシュボードのログアウト処理を行う。
	 */
	$(document).on('mousedown', "#sss-logout", logoutECLUser);

	/**
	 * [ログイン機能(ECL経由)]
	 * AjaxでGETリクエストを送信してログアウト処理を行う。
	 * 成功しても失敗しても処理を終了(SSS側でログアウトページへリダイレクト)する。
	 * @returns boolean true:ログアウトに成功 false:ログアウトに失敗
	 */
	function logoutECLUser() {
		_createAjaxRequest('get', 'users/logout/', null, true, function (data) {
			//成功時
			return true;
		}, function (error) {
			//失敗時
			return false;
		});
	}

	/**
	 * [ユーザ情報変更機能]
	 * ユーザ情報の更新ボタン押下で更新処理開始
	 */
	$('#update_user_update_btn').on('click',function() {
		$('#update_user-dialog').modal('hide');
		_updateUser();
	});

	/**
	 * [ユーザ情報変更機能]
	 * ユーザ情報フォームをAjaxでPOSTし、戻り値で表示するアラートを制御する。
	 * 更新に失敗した場合はアラートでその旨を表示する。
	 * @returns boolean true:更新成功 false:更新失敗(一部成功含む)
	 */
	function _updateUser() {
		return updateUser($('#updateUserForm').serialize(), function (result) {
			if (!result.hasOwnProperty('httpStatus')) {
				if (result == "no_mail_info_falied") {
					//メールアドレス変更申込みなし、名前、パスワード変更失敗
					setSubAlertMessage($('#jsmsg_no_mail_info_falied'));
					$('#update_user-dialog').modal('hide');
					return false;
				}
				else if (result == "mail_failed_info_failed") {
					//メールアドレス変更申込み失敗、名前、パスワード変更失敗
					setSubAlertMessage($('#jsmsg_mail_failed_info_failed'));
					$('#update_user-dialog').modal('hide');
					return false;
				}
				else if (result == "mail_success_info_failed") {
					//メールアドレス変更申込み成功、名前、パスワード変更失敗
					setSubAlertMessage($('#jsmsg_mail_success_info_failed'));
					$('#update_user-dialog').modal('hide');
					return false;
				}
				else if (result == "no_mail_info_success") {
					//メールアドレス変更申込みなし、名前、パスワード変更成功
					setSubAlertMessage($('#jsmsg_no_mail_info_success'));
					$('#update_user-dialog').modal('hide');
					//リダイレクトするのでアラートはphp側で表示
					window.location.href = '/users/config';
					return true;
				}
				else if (result == "mail_failed_info_success") {
					//メールアドレス変更申込み失敗、名前、パスワード変更成功
					setSubAlertMessage($('#jsmsg_mail_failed_info_success'));
					$('#update_user-dialog').modal('hide');
					//リダイレクトするのでアラートはphp側で表示
					window.location.href = '/users/config';
					return false;
				}
				else if (result == "mail_seccess_info_success") {
					//メールアドレス変更申込み成功、名前、パスワード変更成功
					$('#update_user-dialog').modal('hide');
					//リダイレクトするのでアラートはphp側で表示
					window.location.href = '/users/config';
					return true;
				}
				else {
					//エラーは発生していないが、予期せぬ戻り値の場合
					setSubAlertMessage($('#jsmsg_unexpected_return'));
					$('#update_user-dialog').modal('hide');
					return false;
				}
			}
			else {
				//サーバーに接続できなかった場合やjsonがreturnされなかった場合
				setSubAlertMessage($('#jsmsg_failedConnectServer'));
				return false;
			}
		});
	};

	/**
	 * [ユーザ情報変更機能]
	 * ユーザ情報フォームをAjaxでPOSTし、戻り値をコールバック関数に引き渡す
	 * @param body ユーザ情報フォーム
	 * @param callback コールバック関数
	 * @returns boolean true:更新成功 false:更新失敗(一部成功含む)
	 */
	function updateUser(body, callback) {
		var ret;
		_createAjaxRequest('post', 'users/config/', body, true, function (data) {
			ret = callback(data);
		}, function (error) {
			ret = callback(error);
		});
		return ret;
	};

	/**
	 * [ユーザ情報変更機能]
	 * シークレットキー表示切替ボタンの押下でシークレットキーの取得/表示、隠すを切り替える。
	 */
	$('#toggle_secretkey').on('click', function(e) {
		//ボタン連打防止
		$('#toggle_secretkey').prop('disabled','disabled');
		//現在URLの末尾からAppIDを取得
		var appid = location.pathname.split("/");
		appid = appid[appid.length -1];
		var value = $('#toggle_secretkey').val();
		if (value == 'hide') {
			//シークレットキーを表示する
			showSecretkey(appid);
		}
		else if (value == 'show') {
			//シークレットキーを隠す
			changeDisplaySecretkey("************************************");
		}
	});

	/**
	 * [ユーザ情報変更機能]
	 * 引数のアプリケーションのシークレットキーの取得、画面への表示を行う
	 * 取得できなかった場合はアラートを画面に表示する。
	 * @param appid シークレットキーを取得するアプリケーションID
	 * @returns undefined
	 */
	function showSecretkey(appid) {
		//シークレットキーの取得
		getSecretkey(appid, function (result) {
			if (!result.hasOwnProperty('httpStatus')) {
				//画面への表示
				changeDisplaySecretkey(result);
			}
			else {
				setSubAlertMessage($('#jsmsg_failedGetSecretkey'));
				//ボタンの有効化
				$('#toggle_secretkey').prop('disabled',false);
			}
		});
	};

	/**
	 * [ユーザ情報変更機能]
	 * アプリケーションIDをパラメータにajaxでGETリクエストを送信する。
	 * 戻り値を引数に引数のコールバック関数を実行する。
	 * @param appid シークレットキーを取得するアプリケーションID
	 * @param callback ajax結果を引数に受けるコールバック関数
	 * @returns undefined
	 */
	function getSecretkey(appid, callback) {
		_createAjaxRequest('get', 'apps/secretkey/' + appid, null, true, function (data) {
			callback(data);
		}, function (error) {
			callback(error);
		});
	};

	/**
	 * [ユーザ情報変更機能]
	 * 引数をシークレットキーのテキストボックスに表示する。
	 * シークレットキー表示切替ボタンの状態[表示/隠す]を切り替える。
	 * ボタンを有効化する。
	 * @param result シークレットキーのテキストボックスに表示する内容
	 * @returns undefined
	 */
	function changeDisplaySecretkey(result) {
		//シークレットキーの設定
		var input = $('#secretkey-text');
		input.val(result);
		var button = $('#toggle_secretkey');
		//ボタンの状態切り替え
		if (button.val() == 'hide') {
			button.val('show');
			button.text($('#jsmsg_hideSecretkey').render());
		}
		else if (button.val() == 'show') {
			button.val('hide');
			button.text($('#jsmsg_showSecretkey').render());
		}
	//ボタンの有効化
	$('#toggle_secretkey').prop('disabled',false);
	}

	/**
	 * [ユーザ情報変更機能]
	 * 確認ダイアログのシークレットキー再生成ボタンが押下された場合に、シークレットキーの再発行を行う。
	 */
	$('#confirm_regenerate_secretkey').on('click', function() {
		//ボタン連打防止
		$('#confirm_regenerate_secretkey').prop('disabled','disabled');
		$('#regenerate_secretkey-dialog').modal('hide');
		//現在URLの末尾からAppIDを取得
		var appid = location.pathname.split("/");
		appid = appid[appid.length -1];
		regenerateSecretkey(appid);
	});

	/**
	 * [ユーザ情報変更機能]
	 * シークレットキーの再発行、表示を行う
	 * 再発行に失敗した場合、その旨をアラートに表示する。
	 * @param appid シークレットキーを再発行するアプリケーションID
	 * @returns undefined
	 */
	function regenerateSecretkey(appid) {
		//シークレットキーの再発行
		getNewSecretkey(appid, function (result) {
			if (!result.hasOwnProperty('httpStatus')) {
				//シークレットキーの表示
				DisplayNewSecretkey(result);
			}
			else {
				//アラートの表示
				setSubAlertMessage($('#jsmsg_failedRegenerateSecretkey'));
				//ボタン有効化
				$('#confirm_regenerate_secretkey').prop('disabled',false);
			}
		});
	};

	/**
	 * [ユーザ情報変更機能]
	 * 再発行されたシークレットキーを画面に表示する。
	 * @param result 再発行されたシークレットキー
	 * @returns
	 */
	function DisplayNewSecretkey(result) {
		//再発行されたシークレットキーの設定
		var input = $('#secretkey-text');
		input.val(result);
		//画面に発行したシークレットキーを表示するため、隠すボタンに変更
		var button = $('#toggle_secretkey');
		button.val('show');
		button.text($('#jsmsg_hideSecretkey').render());
		$('#confirm_regenerate_secretkey').prop('disabled',false);
		$('#regenerate_secretkey-dialog').modal('hide');
		//更新完了アラートを表示
		setSubAlertMessage($('#jsmsg_setNewSecretkey'));
	}

	/**
	 * [ユーザ情報変更機能]
	 * アプリケーションIDをAjaxでPOSTし、シークレットキーの再発行/取得を行う。
	 * @param appid シークレットキーの再発行を行うアプリケーションID
	 * @param callback 再発行の結果を引数に受けるコールバック関数
	 * @returns undefined
	 */
	function getNewSecretkey(appid, callback) {
		_createAjaxRequest('post', 'apps/secretkey/' + appid, null, true, function (data) {
			callback(data);
		}, function (error) {
			callback(error);
		});
	};

	/**
	 * [アプリケーション一時停止/再開機能]
	 * アプリケーション一覧画面のステータス変更ボタン押下でステータスを切り替える。
	 */
	$('[id$=-status_btn]').on('click', function(e) {
		//ボタン連打防止
		$(e.currentTarget).prop('disabled', 'disabled');
		//末尾の-status-btn11文字分を削除してAPPIDを抽出する。
		var appid = $(e.currentTarget).attr('id').slice(0,-11);
		//現在のステータス
		var status = $(e.currentTarget).attr('value');

		//ステータス変更
		_toggleAppStatus(appid, status);
	});

	/**
	 * [アプリケーション一時停止/再開機能]
	 * アプリケーションのステータス切り替え/画面への表示を行う。
	 * ステータスの切り替えに失敗した場合、アラートを画面に表示する。
	 * @param appid ステータスの切り替えを行うアプリケーションID
	 * @param status 切り替える前の現在のステータス(active/suspended)
	 * @returns undefined
	 */
	function _toggleAppStatus(appid, status) {
		//ステータスの切り替え
		toggleAppStatus(appid, status, function (result) {
			if (!result.hasOwnProperty('httpStatus')) {
				//画面への表示
				changeDisplayStatus(result, appid);
			}
			else {
				//ボタンの有効化
				var button = $('#' + appid + '-status_btn');
				button.prop('disabled',false);
				//アラートの表示
				setSubAlertMessage($('#jsmsg_failedChangeStatus'));
			}
		});
	};

	/**
	 * [アプリケーション一時停止/再開機能]
	 * 画面に表示するステータス/ステータスボタンの状態を変更する。
	 * @param result 変更後ステータス(active/suspended)
	 * @param appid ステータスを変更したアプリケーションID
	 * @returns undefined
	 */
	function changeDisplayStatus(result, appid) {
		//アプリケーションIDからボタンを特定
		var button = $('#' + appid + '-status_btn');
		if (result == 'active') {
			//変更後ステータスがactiveの場合
			//ボタン書き換え
			button.val(result);
			button.removeClass("btn-info").addClass("btn-warning");
			button.empty();
			button.append("<span class=\"glyphicon glyphicon-pause\"></span>");
			button.append($('#jsmsg_suspended_btn').render());
			//ステータス書き換え
			$('#' + appid + '-status').text($('#jsmsg_active').render());
			//完了メッセージ表示
			setSubAlertMessage($('#jsmsg_statusChanged'));
		}
		else if (result == 'suspended') {
			//変更後ステータスがsuspendedの場合
			//ボタン書き換え
			button.val(result);
			button.removeClass("btn-warning").addClass("btn-info");
			button.empty();
			button.append("<span class=\"glyphicon glyphicon-play\"></span>");
			button.append($('#jsmsg_active_btn').render());
			//ステータス書き換え
			$('#' + appid + '-status').text($('#jsmsg_suspended').render());
			//完了メッセージ表示
			setSubAlertMessage($('#jsmsg_statusChanged'));
		}
		//ボタンの有効化
		button.prop('disabled',false);
	}

	/**
	 * [アプリケーション一時停止/再開機能]
	 * アプリケーションID/現在のステータスをパラメータにAjaxでPATCHリクエストを送信する。
	 * @param appid ステータスを変更するアプリケーションID
	 * @param status 変更前の現在のステータス
	 * @param callback ステータス変更結果を受け取るコールバック関数
	 * @returns undefined
	 */
	function toggleAppStatus(appid, status, callback) {
		_createAjaxRequest('patch', 'apps/status/' + appid + '/' + status, null, true, function (data) {
			callback(data);
		}, function (error) {
			callback(error);
		});
	};


	/**
	 * [アプリケーション削除機能]
	 * 確認ダイアログのアプリケーション削除ボタン押下でアプリケーションを削除する。
	 */
	$('#confirm_delete_app').on('click', function() {
		$('#confirm_delete_app').prop('disabled','disabled');
		$('#delete_app-dialog').modal('hide');
		//URLからアプリケーションIDの取得
		var appid = location.pathname.split("/");
		appid = appid[appid.length -1];
		_deleteApp(appid);
	});

	/**
	 * [アプリケーション削除機能]
	 * アプリケーション削除を行い、削除が成功したらアプリケーション一覧画面にパラメータ付きでリダイレクトする。
	 * 削除に失敗した場合、画面にアラートを表示する。
	 * @param appid 削除するアプリケーションID
	 * @returns undefined
	 */
	function _deleteApp(appid) {
		//アプリケーション削除
		deleteApp(appid, function (result) {
			if (!result.hasOwnProperty('httpStatus')) {
				//削除に成功した場合アプリケーション一覧画面にリダイレクト
				window.location.href = '/?deleted=' + appid;
			}
			else {
				//削除に失敗した場合画面にアラート表示
				setSubAlertMessage($('#jsmsg_failedDeleteApp'));
				//ボタン有効化
				$('#confirm_delete_app').prop('disabled',false);
			}
		});
	};

	/**
	 * [アプリケーション削除機能]
	 * アプリケーションIDをパラメータにAjaxでdeleteリクエストを送信してアプリケーションの削除を行う。
	 * @param appid 削除するアプリケーションID
	 * @param callback 削除結果を受け取るコールバック関数
	 * @returns undefined
	 */
	function deleteApp(appid, callback) {
		_createAjaxRequest('delete', 'apps/delete/' + appid, null, true, function (data) {
			callback(data);
		}, function (error) {
			callback(error);
		});
	};

	/**
	 * [接続中PeerID表示機能]
	 * 接続中PeerID表示ボタンが押下された場合(アコーディオンを開いた場合)にPeerIDの取得、表示を行う。
	 * また、timerIntervalに指定されたミリ秒ごとに再取得、再表示を行う。
	 */
	$('[id$=-peer-collapse]').on('show.bs.collapse', function(e) {
		//peerlistが開かれた場合
		//末尾の-peer-collapse14文字分を削除してアプリケーションIDを抽出する。
		var appid = $(e.currentTarget).attr('id').slice(0,-14);

		//開いたタイミングでpeerlist表示
		_createPeerList(appid);

		//開いている場合timerIntervalごとに更新
		_timerId = setInterval(_createPeerList, timerInterval,appid);

		//TimerIDを保存
		timerIDs[appid] = _timerId;
	});

	/**
	 * [接続中PeerID表示機能]
	 * 接続中PeerID表示ボタンがPeerID表示中に再押下された場合(アコーディオンを閉じた場合)に、
	 * 一定間隔で再取得、再表示を行っていたタイマーをリセットする。
	 */
	$('[id$=-peer-collapse]').on('hide.bs.collapse', function(e) {
		//peerlistが閉じられた場合
		//末尾の-peer-collapse14文字分を削除してアプリケーションIDを抽出する。
		var appid = $(e.currentTarget).attr('id').slice(0,-14);
		//定期更新を解除
		clearInterval(timerIDs[appid]);
	});

	/**
	 * [接続中PeerID表示機能]
	 * 指定されたアプリケーションに接続中のPeerID取得/表示を行う。
	 * 処理に失敗した場合はアラートを表示する。
	 * @param id PeerIDを取得/表示するアプリケーションID
	 * @returns undefined
	 */
	function _createPeerList(id) {
		//PeerIDの取得
		getPeerlist(id, function (result) {
			if (!result.hasOwnProperty('httpStatus')) {
				//PeerIDの表示
				createPeerListItem(result, id);
			}
			else {
				createPeerListItem(null, id);
				//アラートの表示
				setSubAlertMessage($('#jsmsg_notGotPeerList'));
			}
		});
	};

	/**
	 * [接続中PeerID表示機能]
	 * PeerIDとアプリケーションIDを受け取り、画面にPeerID一覧を表示する。
	 * @param peerdata 接続中PeerIDデータ
	 * @param appid 表示するアプリケーションのアプリケーションID
	 * @returns undefined
	 */
	function createPeerListItem(peerdata, appid) {
		if (peerdata == null) {
			//エラー時
			$('#' + appid + '-place').html($('#jsmsg_notGotPeerList').render());
		}
		else {
			var _peerlist = $(peerdata)[0]['peers'];

			if (_peerlist.length == 0) {
				//接続中Peerが存在しない場合
				var displayText = $('#jsmsg_notExistPeeridText').render();
			}else {
				//接続中Peerが存在する場合
				var displayText = "";
				$(_peerlist).each(function() {
					displayText += '<p class="peerid">' + this + '</p>';
				});
			}

			//HTMLで出力する。(not text)
			$('#' + appid + '-place').html(displayText);
		}

	};

	/**
	 * [接続中PeerID表示機能]
	 * アプリケーションIDをパラメータにAjaxでGETリクエストを送信して接続中PeerID一覧を取得する。
	 * @param appid PeerID一覧を取得するアプリケーションID
	 * @param callback 取得したPeerID一覧を受け取るコールバック関数
	 * @returns undefined
	 */
	function getPeerlist(appid, callback) {
		_createAjaxRequest('get', 'peers/list/' + appid, null, true, function (data) {
			callback(data);
		}, function (error) {
			callback(error);
		});
	};

	/**
	 * [共通:アラート表示機能]
	 * #subAlertにメッセージを表示する。
	 * 引数msgのclassにtypeとdelayを指定して表示方法を指定する。
	 * type:info/success/warning/danger
	 * delay:数値(ミリ秒) 指定なしで2000ミリ秒
	 * @param msg 表示するメッセージDOM (js_msg.ctpで定義)
	 * @returns undefined
	 */
	function setSubAlertMessage(msg) {
		var alert = $('#subAlert');
		//既存の内容消去
		$(alert).removeClass();
		var list = $(msg)[0].className.split(" ");
		var type;
		var delay;
		//classからtypeとdelayを取得
		$(list).each(function() {
				var index_type = this.indexOf('type=');
				var index_delay = this.indexOf('delay=');
			if(index_type != -1) {
				type = this.split("=");
				type = type[1];
			}
			if(index_delay != -1) {
				delay = this.split("=");
				delay = delay[1];
			}
		});
		switch(type) {
			case 'info' :
				$(alert).addClass('alert alert-info');
				break;
			case 'success' :
				$(alert).addClass('alert alert-success');
				break;
			case 'warning' :
				$(alert).addClass('alert alert-warning');
				break;
			case 'danger' :
				$(alert).addClass('alert alert-danger');
				break;
			default :
				break;
		}
		if (typeof delay === 'undefined') {
			delay = 2000;
		}
		//画面に表示
		$(alert).children().html(msg.render());
		$(alert).fadeIn(500).delay(delay).fadeOut(500);
	};

	/**
	 * [共通:アラート表示機能]
	 * 成功アラートの場合はクリックで表示を消せるようにする
	 */
	$('.alert-success').on('click', function(e) {
		this.classList.add('hidden');
	})

	/**
	 * [共通:アラート表示機能]
	 * toSetSubAlertが存在する場合動的なアラートで表示する
	 */
	if ($('#toSetSubAlert').length) {
		if ($('#toSetSubAlert').text().trim() != "") {
			var id = "#" + $('#toSetSubAlert').text().trim();
			setSubAlertMessage($(id));
		}
	}

	/**
	 * [共通:Csrfトークン更新]
	 * 引数に指定されたCsrfトークンで更新する。
	 * 引数が存在しない場合クッキーからCsrfトークンを取得する。
	 * @param token 更新するCsrfトークン
	 * @returns undefined
	 */
	function updateCsrfToken(token) {
		if (token != null) {
			csrfToken = token;
		}else {
			csrfToken = Cookies.get('csrfToken');
		}
	};

	/**
	 * [共通:Ajaxリクエスト送信]
	 * Ajaxリクエストの送信/結果をコールバック関数に渡す。
	 * @param method リクエストメソッド
	 * @param urlquery リクエストURL
	 * @param body リクエストボディ
	 * @param synctype true:同期通信 false:非同期通信
	 * @param success 処理成功時コールバック関数
	 * @param errors 処理失敗時コールバック関数
	 * @returns undefined
	 */
	function _createAjaxRequest(method, urlquery, body, synctype, success, errors) {
	var _url = null;
	//リクエストURLの作成
	if (urlquery != null) {
		_url = endpoint + '/' + urlquery;
	}
	else {
		_url = endpoint;
	}
	//Ajaxの実行
	$.ajax({
		url: _url,
		type: method,
		headers: {
			'X-Csrf-Token': csrfToken
		},
		data: body,
		dataType: 'json',
		async: synctype,
		timeout: 10000,
	}).done(function (result, textStatus, jqXHR) {
		//通信成功時の処理
			updateCsrfToken();
			try {
				var res = $.parseJSON(jqXHR.responseText);
				if (res.error != undefined) {
					//エラーレスポンスの場合
					if (res.error.code == 401 && res.error.message == "Unauthorized") {
						//セッションが切れていた場合ログインページへリダイレクト
						window.location.href = '/users/login';
						return;
					}
					else if (res.error.code == 405 && res.error.message == "MethodNotAllowed") {
						//禁止されているメソッドの場合エラー通知画面の表示
						window.location.href = '/AppError/method_not_allowed';
						return;
					}
					else if (res.error.message == "systemerror") {
						//通常のエラー通知画面の表示
						window.location.href = '/AppError/system_error';
						return;
					}
					else {
						//それ以外の場合アラート表示
						var _error = {
								httpStatus: jqXHR.status,
								errorStatus: textStatus,
						};
					}
				}

			} catch (e) {
				//レスポンスが空の場合に後続処理を行う
			}
			if (_error != undefined) {
				errors(_error);
			}
			else {
				success(result);
			}
	}).fail(function (jqXHR, textStatus, errorThrown) {
		//通信失敗時の処理
			updateCsrfToken();
			var _error = {
				httpStatus: jqXHR.status,
				errorStatus: textStatus,
				errorThrown: errorThrown
			};
			if (jqXHR.status == 403 && errorThrown == "Forbidden") {
				//認証ページがセッション切れで権限なしの場合ログインページへリダイレクト
				window.location.href = '/users/login';
			}
			if (errors != null) {
				errors(_error);
			}
	});
}

	/**
	 * [モーダル:ユーザ情報変更機能]
	 * アクティブになったモーダルのバリデーションを有効化する。
	 * (ユーザ情報変更画面で複数モーダルが存在するための対応)
	 */
	$('[id$=_user-dialog]').on('show.bs.modal', function(e) {
		//アクティブになったモーダルの取得
		var modal = $(e.currentTarget).attr('id');

		//ボタンの取得
		var btn = $("#" + modal + " .modal_empty_validation_submit_btn");
		//バリデーション有効化
		$(btn).removeClass("modal_empty_validation_submit_btn").addClass("empty_validation_submit_btn");
		//フィールドの取得
		var fields = $("#" + modal + " .modal_empty_validation_field");
		$(fields).each(function() {
			//バリデーション有効化
			$(this).removeClass("modal_empty_validation_field").addClass("empty_validation_field");
			$(this).on('input', emptyValidation);
		});

		//ユーザ情報をモーダルにコピー
		$('#none_display_name').val($('#name').val());
		$('#none_display_email').val($('#email').val());
		$('#none_display_password').val($('#password').val());
	});

	/**
	 * [モーダル：ユーザ情報変更機能]
	 * 非活性となったモーダルのバリデーションを無効化する。
	 * (ユーザ情報変更画面で複数モーダルが存在するための対応)
	 */
	$('[id$=-dialog]').on('hide.bs.modal', function(e) {
		//非活性となったモーダルの取得
		var modal = $(e.currentTarget).attr('id');
		//ボタンの取得
		var btn = $("#" + modal + " .empty_validation_submit_btn");
		//バリデーション無効化
		$(btn).removeClass("empty_validation_submit_btn").addClass("modal_empty_validation_submit_btn");
		//フィールドの取得
		var fields = $("#" + modal + " .empty_validation_field");
		$(fields).each(function() {
			//バリデーション無効化
			$(this).removeClass("empty_validation_field").addClass("modal_empty_validation_field");
			$(this).on('input', emptyValidation);
		});
	});

	/**
	 * [共通:バリデーション]
	 * 入力があった際に空かどうかのみを確認する簡単なバリデーションを設定する。
	 */
	$('.empty_validation_field:not(.modal_field)').on('input', emptyValidation);

	/**
	 * [共通:バリデーション]
	 * フォームに値が入力されているかどうかのみを確認する。
	 * 全てのフィールドが入力されている場合に、
	 * empty_validation_submit_btnクラスのボタンを有効にする。
	 * 監視フィールド：empty_validation_fieldクラス
	 *
	 * 使い方：empty_validation_fieldクラスを付与する。
	 * validation_fieldクラスと併用不可、
	 * 全てのフィールドが値の入力確認で良い場合以外はvalidation_fieldを利用する。
	 */
	function emptyValidation() {
		var submitBtn = $('.empty_validation_submit_btn');
		var result = true;
		$('.empty_validation_field').each(function() {
			if($(this).val() == '') {
				//空のフィールドが存在する場合
				result = false;
				return false;
			}
		});
		if(result) {
			//空のフィールドが存在しない場合、ボタンの有効化
			submitBtn.prop('disabled', false);
		}
		else {
			//空のフィールドが存在する場合、ボタンの無効化
			submitBtn.prop('disabled', 'disabled');
		}
	};

	/**
	 * [共通:バリデーション]
	 * 読み込み時、validation_fieldクラスにvalidationEngineのバリデーションを実行
	 */
	$('.validation_field').each(function() {
		$(this).validationEngine('validate')
	});

	/**
	 * [共通:バリデーション]
	 * フォームでのリアルタイムバリデーションを行う。
	 * 全てのバリデーションが通った場合に、
	 * submit_btnクラスのボタンを有効にする。
	 * 監視フィールド：validation_fieldクラス,
	 * equals-for-<監視id>クラス(validation_fieldクラスにequalsのバリデーションが指定された場合)
	 *
	 * 使い方：formErrorクラスの親のidを、
	 * 監視フィールドのdata-prompt-target属性に指定する。
	 */
	$('.validation_field').on('input', function(e) {

		var submitBtn = $('.submit_btn');
		var errorCount = $('.formError').length;

		//他のフィールドと一致していることを確認するバリデーションのための処理
		//(確認用パスワード)
		var id = $(e.currentTarget).attr("id");
		$('[class*=equals-for-' + id + ']').each(function() {
			if($(this).validationEngine('validate')) {
				$(this).removeClass("validation-ng");
				//equals-for-<一致確認するid>クラスのバリデーションが通った場合
				var validationOk = $(this).attr("data-prompt-target");
				$('.formError').each(function() {
					//バリデーションがErrorから変更されたかどうかを確認
					var error = $(this).parent().attr("id");
					if(validationOk == error) {
						$(this).remove();
						errorCount = errorCount -1;
					}
				});
			}
			else {
				$(this).addClass("validation-ng");
			}
		});

		if($(e.currentTarget).validationEngine('validate')) {
			//バリデーションが通った場合
			$(e.currentTarget).removeClass("validation-ng");
			if(errorCount == 1) {
				//エラー項目が残り1つの場合
				var validationOk = $(e.currentTarget).attr("data-prompt-target");
				var error =$('.formError').parent().attr("id");
				if(validationOk == error) {
					//バリデーションが通った項目と、最後のエラー項目が一致していた場合
					//submitボタンを有効化
					submitBtn.prop('disabled', false);
				}
			}
			if(errorCount == 0) {
				//エラーなしからバリデーションが通った場合
				submitBtn.prop('disabled', false);
			}
		}
		else {
			//バリデーションが通らなかった場合
			//背景色の変更
			$(e.currentTarget).addClass("validation-ng");
			//submitボタンを無効化
			submitBtn.prop('disabled', 'disabled');
		}
	});
});